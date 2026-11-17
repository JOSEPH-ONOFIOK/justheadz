// Runs before paint: once the tear intro has played this session, skip it.
// It sets data-seen on <html>, which hides .intro and zeroes --wait.
export const INTRO_BOOT = `try{if(sessionStorage.getItem("jh-intro"))document.documentElement.dataset.seen="1"}catch(e){}`;
