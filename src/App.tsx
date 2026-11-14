/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { WeavePrototypeApp } from './ui-prototype/WeavePrototypeApp';
import { useEffect, useState } from 'react';
import LiveAnalysisConsole from './LiveAnalysisConsole';

export default function App() {
  const [live,setLive]=useState(window.location.hash==='#live-console');
  useEffect(()=>{const navigate=()=>{const open=window.location.hash==='#live-console';setLive(open);if(open)window.scrollTo(0,0);};window.addEventListener('hashchange',navigate);return()=>window.removeEventListener('hashchange',navigate);},[]);
  return live ? <LiveAnalysisConsole/> : <WeavePrototypeApp />;
}
