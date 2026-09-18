// 마이크 소리 → 16kHz mono PCM s16le(명세 20.2). React 에 기대지 않는 순수 모듈이라 node 테스트에서 그대로 부른다.
//
// AudioWorklet 은 모듈을 import 할 수 없어서 워클릿(`apps/web/public/voice/pcm-worklet.js`)은
// 모노로 합치고 블록을 모으는 일만 한다. 표본율 변환과 부호화는 여기 한 곳에만 둔다.

export const TARGET_SAMPLE_RATE = 16000;
export const BYTES_PER_SAMPLE = 2;
/** 한 번에 보내는 조각 길이. 명세가 말하는 20~100ms 안쪽이다. */
export const FRAME_MS = 40;
export const FRAME_SAMPLES = (TARGET_SAMPLE_RATE * FRAME_MS) / 1000;

/** 16kHz s16le 기준 바이트 수 → 밀리초. */
export function pcmDurationMs(byteLength: number, sampleRate = TARGET_SAMPLE_RATE): number {
  return Math.round((byteLength / BYTES_PER_SAMPLE / sampleRate) * 1000);
}

/** 항상 새 버퍼로 복사한다 — 넘겨받은 버퍼(워클릿에서 온 것)를 계속 붙들고 있지 않는다. */
function concat(head: Float32Array, tail: Float32Array): Float32Array<ArrayBuffer> {
  const merged = new Float32Array(head.length + tail.length);
  merged.set(head, 0);
  merged.set(tail, head.length);
  return merged;
}

/**
 * 기기 표본율(보통 44.1k·48k)에서 16kHz 로 내리는 선형 보간 리샘플러.
 * 블록 경계에서 소리가 끊기지 않도록 읽던 위치와 남은 꼬리를 들고 있는다.
 */
export function createResampler(inputRate: number, targetRate = TARGET_SAMPLE_RATE) {
  if (!(inputRate > 0)) throw new Error('inputRate must be positive');
  const ratio = inputRate / targetRate;
  let position = 0; // 다음에 읽을 입력 표본 위치(소수)
  let tail = new Float32Array(0); // 아직 못 읽은 입력 꼬리

  return {
    ratio,
    /** 입력 블록을 받아 만들 수 있는 만큼의 출력 표본을 돌려준다. */
    process(chunk: Float32Array): Float32Array {
      const input = concat(tail, chunk);
      if (input.length < 2) {
        tail = input;
        return new Float32Array(0);
      }
      // 마지막 표본은 보간 짝이 없으므로 input.length - 1 까지만 읽는다.
      const count = Math.max(0, Math.floor((input.length - 1 - position) / ratio) + 1);
      const out = new Float32Array(count);
      let cursor = position;
      for (let index = 0; index < count; index += 1) {
        const left = Math.floor(cursor);
        const fraction = cursor - left;
        const a = input[left] ?? 0;
        const b = input[left + 1] ?? a;
        out[index] = a + (b - a) * fraction;
        cursor += ratio;
      }
      const consumed = Math.min(Math.floor(cursor), input.length - 1);
      tail = new Float32Array(input.subarray(consumed));
      position = cursor - consumed;
      return out;
    },
    /** 다음 발화를 위해 상태를 비운다. */
    reset() {
      position = 0;
      tail = new Float32Array(0);
    },
  };
}

export type Resampler = ReturnType<typeof createResampler>;

/** -1~1 Float32 → signed 16-bit little-endian. 범위를 벗어난 값은 잘라 낸다. */
export function encodePcm16(samples: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(samples.length * BYTES_PER_SAMPLE);
  const view = new DataView(buffer);
  for (let index = 0; index < samples.length; index += 1) {
    const value = Math.max(-1, Math.min(1, samples[index] ?? 0));
    view.setInt16(index * BYTES_PER_SAMPLE, Math.round(value * 0x7fff), true);
  }
  return buffer;
}

/** 조용히 있었는지 보는 값. 무음 안내를 다른 오류와 구분하는 데 쓴다. */
export function peakLevel(samples: Float32Array): number {
  let peak = 0;
  for (let index = 0; index < samples.length; index += 1) {
    const value = Math.abs(samples[index] ?? 0);
    if (value > peak) peak = value;
  }
  return peak;
}

/**
 * 표본을 모아 두었다가 정해진 길이(기본 40ms)가 차면 조각으로 내보낸다.
 * `flush()` 는 발화 끝에 남은 짧은 꼬리까지 내보낸다.
 */
export function createFrameBuffer(frameSamples = FRAME_SAMPLES) {
  let pending = new Float32Array(0);
  return {
    push(samples: Float32Array): ArrayBuffer[] {
      pending = concat(pending, samples);
      const frames: ArrayBuffer[] = [];
      let offset = 0;
      while (pending.length - offset >= frameSamples) {
        frames.push(encodePcm16(pending.subarray(offset, offset + frameSamples)));
        offset += frameSamples;
      }
      pending = new Float32Array(pending.subarray(offset));
      return frames;
    },
    flush(): ArrayBuffer[] {
      if (pending.length === 0) return [];
      const frame = encodePcm16(pending);
      pending = new Float32Array(0);
      return [frame];
    },
    reset() {
      pending = new Float32Array(0);
    },
  };
}
