import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const native = vi.hoisted(() => ({ value: false }));
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => native.value },
}));

import { ANDROID_APK_URL, keepFocusedFieldVisible } from '../../src/lib/device';
import { AndroidDownload } from '../../src/features/auth/AndroidDownload';

afterEach(() => {
  native.value = false;
  document.body.innerHTML = '';
});

function fakeViewport(height: number) {
  const target = new EventTarget() as EventTarget & { height: number };
  target.height = height;
  return target;
}

describe('Android download', () => {
  it('links straight to the raw APK file so the browser downloads it', () => {
    render(<AndroidDownload />);
    const link = screen.getByTestId('apk-download');
    expect(link.getAttribute('href')).toBe(ANDROID_APK_URL);
    expect(ANDROID_APK_URL).toMatch(
      /^https:\/\/raw\.githubusercontent\.com\/SolutionsFurlaneti\/AndroidPackageKit\/main\/AutoCareManager\/AutoCareManager\.apk$/,
    );
    expect(link.hasAttribute('download')).toBe(true);
  });

  it('is hidden inside the Android app itself', () => {
    native.value = true;
    render(<AndroidDownload />);
    expect(screen.queryByTestId('apk-download')).toBeNull();
  });
});

describe('virtual keyboard', () => {
  it('scrolls the focused field and the submit button into view when the keyboard opens', () => {
    document.body.innerHTML =
      '<form><input id="email" /><button type="submit">Entrar</button></form><input id="solto" />';
    const visual = fakeViewport(800);
    const unbind = keepFocusedFieldVisible({
      visualViewport: visual,
      document,
    } as unknown as Window);
    const email = document.getElementById('email')!;
    const button = document.querySelector('button')!;
    const scrolled: string[] = [];
    email.scrollIntoView = () => scrolled.push('email');
    button.scrollIntoView = () => scrolled.push('button');
    email.focus();

    visual.height = 780; // small change (address bar): ignored
    visual.dispatchEvent(new Event('resize'));
    expect(scrolled).toEqual([]);

    visual.height = 420; // keyboard opened
    visual.dispatchEvent(new Event('resize'));
    expect(scrolled).toEqual(['button', 'email']);

    unbind();
    visual.height = 200;
    visual.dispatchEvent(new Event('resize'));
    expect(scrolled).toHaveLength(2);
  });

  it('ignores the keyboard when nothing editable has focus', () => {
    document.body.innerHTML = '<button id="b">x</button>';
    const visual = fakeViewport(800);
    keepFocusedFieldVisible({ visualViewport: visual, document } as unknown as Window);
    const b = document.getElementById('b')!;
    const spy = vi.fn();
    b.scrollIntoView = spy;
    b.focus();
    visual.height = 400;
    visual.dispatchEvent(new Event('resize'));
    expect(spy).not.toHaveBeenCalled();
  });
});
