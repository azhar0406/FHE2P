let fhenixjs = null;

if (typeof window !== 'undefined') {
  // Dynamically import fhenixjs only on the client side
  fhenixjs = import('fhenixjs').then(module => module.default);
}

export default fhenixjs;