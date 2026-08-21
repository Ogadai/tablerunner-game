import styles from "./page.module.css";
import { cinzel } from '@/app/fonts';
import Image from 'next/image';

export default function Home() {
  return (
    <div>
      <main>
        <h2 className={`${cinzel.className} antialiased`}>TableRunner</h2>
        <p>Scan the QR code on a supported game board to start playing!</p>

        <Image
          src="/hero-barbarian-witch.png"
          width={1400}
          height={1100}
          className={styles.heroImage}
          loading="eager"
          alt="The Hero image for TableRunner, showing a barbarian and a witch"
        />
      </main>
    </div>
  );
}
