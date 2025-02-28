import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Chakra UI の使用ができない（import エラー?)
//import { Provider } from "@/components/ui/provider"
//import { ChakraProvider } from "@chakra-ui/react";

createRoot(document.getElementById('root')).render(
  <StrictMode>
   <>
    <App />
   </>
     
    
  </StrictMode>,
)
