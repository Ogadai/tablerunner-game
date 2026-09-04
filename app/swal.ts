import { SweetAlertOptions } from "sweetalert2";

export function getSwalDefaultOptions(): SweetAlertOptions {
  return {
    heightAuto: false,
    theme: 'auto',
    willOpen: (modal) => {
      window.dispatchEvent(new Event('close-active-radix-dialogs'));
    }
  };
};
