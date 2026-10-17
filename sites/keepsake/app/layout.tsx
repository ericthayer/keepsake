import type { Metadata } from "next";
import "./globals.css";
import { AppearanceProvider } from "./components/appearance";
import { appearanceBootstrap } from "../lib/appearance";
export const metadata: Metadata = { title:"Keepsake — A little more prepared",description:"A thoughtful place for the information your family may need. Organize account connections, document locations, and the people to call.",robots:{index:false,follow:false},icons:{icon:"/favicon.svg"} };
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>) { return <html lang="en" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:appearanceBootstrap}}/></head><body><AppearanceProvider>{children}</AppearanceProvider></body></html>; }
