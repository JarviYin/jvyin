export interface SharePayload {
  title: string;
  description?: string;
  url: string;
  image?: string;
  id?: string;
  view?: boolean;
  source?: string;
  date?: string;
}

const selector = '[data-share-bar]';
const focusableSelector = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
const sharedViewParameters = new Set(['q', 'sector', 'chain', 'stage', 'compare', 'sort', 'order', 'metric', 'range', 'snapshot', 'capability', 'asset', 'feed', 'publisher']);

function textFor(payload: SharePayload) {
  return payload.description ? `${payload.title} — ${payload.description}` : payload.title;
}

function currentUrl(payload: SharePayload) {
  if (!payload.view || typeof window === 'undefined') return payload.url;
  const current = new URL(window.location.href);
  const canonical = new URL(payload.url);
  for (const [key, value] of current.searchParams) {
    if (sharedViewParameters.has(key)) canonical.searchParams.append(key, value);
  }
  return canonical.href;
}

async function copy(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    const field = document.createElement('textarea');
    field.value = value;
    field.setAttribute('readonly', '');
    field.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
    document.body.append(field);
    field.select();
    const copied = document.execCommand('copy');
    field.remove();
    return copied;
  }
}

function setStatus(root: HTMLElement, message: string) {
  root.querySelectorAll<HTMLElement>('[data-share-status], [data-share-dialog-status]').forEach(status => { status.textContent = message; });
}

function drawWrappedText(context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines: number) {
  const lines: string[] = [];
  let line = '';
  for (const character of text) {
    if (context.measureText(`${line}${character}`).width > maxWidth && line) {
      lines.push(line);
      line = character;
      if (lines.length === maxLines) break;
    } else line += character;
  }
  if (line && lines.length < maxLines) lines.push(line);
  lines.forEach((value, index) => context.fillText(value, x, y + index * lineHeight));
  return y + lines.length * lineHeight;
}

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
  });
}

async function downloadPoster(payload: SharePayload, url: string): Promise<boolean> {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 630;
  const context = canvas.getContext('2d');
  if (!context) return false;
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#161616';
  context.fillRect(72, 64, 8, 502);
  context.font = '500 28px sans-serif';
  context.fillStyle = '#666666';
  context.fillText(`${payload.source ?? 'jvyin.com'}${payload.date ? ` · ${payload.date}` : ''}`, 112, 108);
  context.font = '700 50px sans-serif';
  context.fillStyle = '#161616';
  let bottom = drawWrappedText(context, payload.title, 112, 185, 690, 65, 2);
  if (payload.description) {
    context.font = '400 25px sans-serif';
    context.fillStyle = '#555555';
    bottom = drawWrappedText(context, payload.description, 112, bottom + 28, 690, 37, 2);
  }
  context.font = '400 22px monospace';
  context.fillStyle = '#777777';
  const publicUrl = new URL(url);
  const shortUrl = `${publicUrl.hostname}${publicUrl.pathname}`;
  context.fillText(shortUrl, 112, 495);
  context.font = '400 19px sans-serif';
  context.fillText(publicUrl.search ? '保留当前筛选，请使用「复制链接」分享' : '公开页面', 112, 532);

  if (payload.id) {
    try {
      const qr = await loadImage(`/share/${payload.id}.png`);
      context.fillStyle = '#ffffff';
      context.fillRect(865, 126, 236, 236);
      context.drawImage(qr, 875, 136, 216, 216);
      context.font = '400 18px sans-serif';
      context.fillStyle = '#666666';
      context.fillText('扫码打开公开页面', 895, 390);
    } catch {
      // The poster remains useful even if a local static QR asset is missing.
    }
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) return resolve(false);
      const download = document.createElement('a');
      const objectUrl = URL.createObjectURL(blob);
      download.href = objectUrl;
      download.download = `${payload.id ?? 'jvyin'}-share.png`;
      download.click();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
      resolve(true);
    }, 'image/png');
  });
}

function openDialog(root: HTMLElement, trigger: HTMLElement) {
  const dialog = root.querySelector<HTMLDialogElement>('dialog');
  if (!dialog) return;
  setStatus(root, '');
  root.dataset.shareTrigger = String(trigger.dataset.shareAction ?? '');
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
  dialog.querySelector<HTMLElement>('[data-share-close]')?.focus();
}

function closeDialog(root: HTMLElement) {
  const dialog = root.querySelector<HTMLDialogElement>('dialog');
  if (!dialog) return;
  if (dialog.open && typeof dialog.close === 'function') dialog.close();
  else dialog.removeAttribute('open');
  root.querySelector<HTMLElement>(`[data-share-action="${root.dataset.shareTrigger ?? 'share'}"]`)?.focus();
}

export function mountShareBars() {
  document.querySelectorAll<HTMLElement>(selector).forEach((root) => {
    if (root.dataset.shareMounted === 'true') return;
    root.dataset.shareMounted = 'true';
    const source = root.dataset.sharePayload;
    if (!source) return;
    const payload: SharePayload = JSON.parse(source);
    const canonicalUrl = payload.url;
    const makeUrl = () => currentUrl(payload);
    const dialog = root.querySelector<HTMLDialogElement>('dialog');

    root.addEventListener('click', async (event) => {
      const target = (event.target as Element).closest<HTMLElement>('[data-share-action]');
      if (!target) return;
      const action = target.dataset.shareAction;
      if (action === 'close') return closeDialog(root);
      if (action === 'open') return openDialog(root, target);
      if (action === 'native') {
        if (navigator.share) {
          try {
            await navigator.share({ title: payload.title, text: textFor(payload), url: makeUrl() });
            setStatus(root, '已打开系统分享。');
          } catch (error) {
            if ((error as DOMException).name !== 'AbortError') setStatus(root, '系统分享未完成，请选择其他方式。');
          }
        } else if (!dialog?.open) openDialog(root, target);
        else {
          const message = '当前浏览器不支持系统分享，请选择下方平台或复制链接。';
          setStatus(root, message);
        }
        return;
      }
      if (action === 'copy') {
        setStatus(root, (await copy(makeUrl())) ? '链接已复制。' : '复制失败，请手动复制地址。');
        return;
      }
      if (action === 'x') {
        const url = new URL('https://x.com/intent/post');
        url.searchParams.set('text', textFor(payload));
        url.searchParams.set('url', makeUrl());
        window.open(url, '_blank', 'noopener,noreferrer');
        return;
      }
      if (action === 'poster') {
        setStatus(root, (await downloadPoster(payload, makeUrl())) ? '分享卡片已下载。' : '无法生成分享卡片。');
        return;
      }
      if (action === 'linkedin' || action === 'telegram') {
        const url = new URL(action === 'linkedin' ? 'https://www.linkedin.com/sharing/share-offsite/' : 'https://t.me/share/url');
        url.searchParams.set('url', makeUrl());
        if (action === 'telegram') url.searchParams.set('text', textFor(payload));
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    });

    dialog?.addEventListener('click', (event) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      const outside = event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
      if (outside) closeDialog(root);
    });
    dialog?.addEventListener('cancel', (event) => {
      event.preventDefault();
      closeDialog(root);
    });
    dialog?.addEventListener('keydown', (event) => {
      if (event.key !== 'Tab') return;
      const items = [...dialog.querySelectorAll<HTMLElement>(focusableSelector)];
      if (!items.length) return;
      const first = items[0];
      const last = items.at(-1)!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
    root.querySelector<HTMLElement>('[data-share-canonical]')?.setAttribute('href', canonicalUrl);
  });
}
