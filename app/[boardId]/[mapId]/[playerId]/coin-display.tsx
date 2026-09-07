import Image from 'next/image';

import styles from './coin-display.module.css';

export default function CoinDisplay({ coins }: { coins: number }) {
  return <div className={styles.coinDisplay}>
    <span className={styles.coins}>{coins}</span>
    <Image
      className={styles.coinImage}
      src="/coin.png"
      width={40}
      height={40}
      loading="eager"
      alt="Coins"
    />
  </div>;
}