// Debounced save of the current rhythm to localStorage.
import {st} from '../state.js';
import {store} from '../model/rhythm.js';
let sT = 0;
export function saveSoon() {
  clearTimeout(sT);
  sT = setTimeout(() => store(st.pat), 300);
}
