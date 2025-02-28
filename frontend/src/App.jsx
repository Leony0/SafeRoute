import { useEffect, useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
// import Iframe from "react-iframe";

import React from "react";
import axios from "axios";

import Word from "./components/Word"
import Header from "./components/Header"


import './App.css';
import GoogleMap from './components/GoogleMap';

export default function App() {
  return (
    <div className="app-container">
      <Header />
      <div className="app-content">
        <Word />
        <GoogleMap />
      </div>
    </div>
  );
}


// function App() {
//   return (
//     <div>
//       <Iframe url="http://localhost:8000/map" width="100%" height="100%" />
//     </div>
//   );
// }

// export default function MapPage() {
//   const [mapUrl, setMapUrl] = useState("");

//   useEffect(() => {
//     setMapUrl("http://localhost:8000/map");
//   }, []);

//   return (
//     <div className="w-screen h-screen relative">
//       {mapUrl ? (
//         <iframe 
//           src={mapUrl} 
//           className="absolute top-0 left-0 w-full h-full border-2 shadow-lg" 
//           title="Map"
//         />
//       ) : (
//         <p>Loading map...</p>
//       )}
//     </div>
//   );
// }

//ここはかなりシンプルなコードしか書かないようにする
//127.0.0.1:8000/word/all/


// const App = () => {
//  return( 
//    <>
   
//     <h1>英単語アプリ</h1>
//     <Word />
   
//    </>
//  )
// };

//export default App;
