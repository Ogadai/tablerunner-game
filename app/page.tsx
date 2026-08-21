import styles from "./page.module.css";
import { cinzel } from '@/app/fonts';
import Image from 'next/image';

export default function Home() {
  return (
    <div>
      <main>
        <h3 className={`${cinzel.className} antialiased`}>Welcome to TableRunner</h3>
        <p>Scan the QR code on a supported game board to start playing!</p>

        <Image
          src="/hero-barbarian-witch.png"
          width={1000}
          height={760}
          className={styles.heroImage}
          alt="The Hero image for TableRunner, showing a barbarian and a witch"
        />
      </main>
    </div>
  );
}
