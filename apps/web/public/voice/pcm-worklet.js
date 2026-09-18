// 마이크 소리를 모아 보내는 AudioWorklet (명세 20.2).
//
// AudioWorklet 전역에서는 모듈을 import 할 수 없다. 그래서 여기서는 채널을 모노로 합치고
// 블록을 모아 보내기만 하고, 16kHz 변환과 s16le 부호화는 한 곳(`features/village/voice/pcm.ts`)에서만 한다.
// 그 편이 같은 코드를 두 벌 두지 않고 node 테스트로 검증할 수 있다.
//
// 이 파일은 정적 자산이라 `/voice/pcm-worklet.js` 모듈 URL 로 `audioWorklet.addModule()` 에 넣는다.

const BLOCK_SAMPLES = 1024; // 48kHz 기준 약 21ms. 한 조각(40ms)보다 짧게 잡아 지연을 줄인다.

class PcmCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Float32Array(BLOCK_SAMPLES);
    this.filled = 0;
    this.running = true;
    this.port.onmessage = (event) => {
      if (event.data === 'stop') {
        this.flush();
        this.running = false;
      }
    };
  }

  flush() {
    if (this.filled === 0) return;
    const block = this.buffer.slice(0, this.filled);
    this.filled = 0;
    this.port.postMessage({ samples: block, sampleRate }, [block.buffer]);
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0) return this.running;
    const frames = input[0].length;
    for (let index = 0; index < frames; index += 1) {
      // 여러 채널이 오면 평균을 내 모노로 만든다.
      let sum = 0;
      for (let channel = 0; channel < input.length; channel += 1) sum += input[channel][index];
      this.buffer[this.filled] = sum / input.length;
      this.filled += 1;
      if (this.filled === BLOCK_SAMPLES) this.flush();
    }
    return this.running;
  }
}

registerProcessor('jjcp-pcm-capture', PcmCaptureProcessor);
