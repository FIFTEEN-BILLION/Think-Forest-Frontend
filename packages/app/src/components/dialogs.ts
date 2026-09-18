/** Browser/WebView-safe dialogs. Native window.prompt is unavailable in some hosts. */
function showDialog(message: string, initial?: string): Promise<string | null> {
  return new Promise((resolve) => {
    const previous = document.activeElement;
    const dialog = document.createElement('dialog');
    dialog.className = 'panel server-confirm-dialog';
    dialog.style.cssText = 'max-width: min(28rem, 90vw); padding: 1.5rem; border-radius: 1rem;';
    const form = document.createElement('form');
    form.method = 'dialog';
    const title = document.createElement('p');
    title.id = `dialog-${crypto.randomUUID()}`;
    title.textContent = message;
    dialog.setAttribute('aria-labelledby', title.id);
    const input = document.createElement('input');
    input.type = 'text';
    input.value = initial ?? '';
    input.setAttribute('aria-label', message);
    const buttons = document.createElement('div');
    buttons.className = 'row';
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'btn light';
    cancel.textContent = '취소';
    const submit = document.createElement('button');
    submit.type = 'submit';
    submit.className = 'btn';
    submit.textContent = '확인';
    let result: string | null = null;
    cancel.onclick = () => dialog.close();
    form.onsubmit = (event) => {
      event.preventDefault();
      result = initial === undefined ? 'confirmed' : input.value;
      dialog.close();
    };
    dialog.onclose = () => {
      dialog.remove();
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
      resolve(result);
    };
    buttons.append(cancel, submit);
    form.append(title);
    if (initial !== undefined) form.append(input);
    form.append(buttons);
    dialog.append(form);
    document.body.append(dialog);
    dialog.showModal();
    if (initial !== undefined) input.focus();
    else cancel.focus();
  });
}

export const confirmAction = async (message: string) => (await showDialog(message)) !== null;
export const promptText = (message: string, initial = '') => showDialog(message, initial);
