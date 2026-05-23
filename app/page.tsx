import Image from "next/image";
import { DarkVeilCanvas } from "./components/weil";
import ShaderWorkspace from "./controller";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <Link href="/darkweil">Darkweil</Link>
      <Link href="/cosmic">Cosmic</Link>
      <Link href="/vibrant">Vibrant</Link>
      <Link href="/sleepy">Sleepy</Link>
      <Link href="/ocean">Ocean</Link>
      <Link href="/tides">Tides</Link>
      <Link href="/macos">Macos</Link>
      <Link href="/sequoia">Sequoia</Link>
      <Link href="/shards">Shards</Link>
      <Link href="/crosspoint">Crosspoint</Link>
      <Link href="/aurora">Aurora</Link>
      <Link href="/holographic">Holographic</Link>
      <Link href="/lotus">Lotus</Link>
      <Link href="/organic-flower">Organic-flowers</Link>
      <Link href="/aesthetic">Aesthetic</Link>
      <Link href="/blooming">Blooming</Link>
      <Link href="/real-rose">Rose</Link>
    </div>
  );
}
