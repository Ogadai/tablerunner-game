import Image from 'next/image';

import styles from './coin-display.module.css';

export default function CoinDisplay({
  coins,
  inline = false,
  className,
}: {
  coins: number;
  inline?: boolean;
  className?: string;
}) {
  const Tag = inline ? 'span' : 'div';
  return <Tag className={`${styles.coinDisplay}${className ? ` ${className}` : ''}`}>
    <span className={styles.coins}>{coins}</span>
    <Image
      className={styles.coinImage}
      src="/coin.png"
      width={40}
      height={40}
      loading="eager"
      alt="Coins"
    />
  </Tag>;
}