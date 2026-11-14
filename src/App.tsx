/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { WeavePrototypeApp } from './ui-prototype/WeavePrototypeApp';
import { useEffect, useState } from 'react';
import LiveAnalysisConsole from './LiveAnalysisConsole';

export default function App() {
  const isLive=()=>['#live-console','#/live-console'].includes(window.location.hash)||(!window.location.hash&&new URLSearchParams(window.location.search).get('view')==='live-console');
  const [live,setLive]=useState(isLive);
  useEffect(()=>{const navigate=()=>{const open=isLive();setLive(open);if(open)window.scrollTo(0,0);};window.addEventListener('hashchange',navigate);return()=>window.removeEventListener('hashchange',navigate);},[]);
  return live ? <LiveAnalysisConsole/> : <WeavePrototypeApp />;
}
