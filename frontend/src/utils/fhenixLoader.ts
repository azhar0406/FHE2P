let fhenixPromise: Promise<any> | null = null;

export const loadFhenix = () => {
  if (!fhenixPromise) {
    fhenixPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = '/fhenix.esm.min.js';
      script.async = true;
      script.onload = () => resolve((window as any).Fhenix);
      script.onerror = reject;
      document.body.appendChild(script);
    });
  }
  return fhenixPromise;
};