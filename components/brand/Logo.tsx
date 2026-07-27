import Image from "next/image";
import styles from "./Logo.module.css";

export type LogoVariant = "wordmark" | "monogram" | "horizontal";
export type LogoSurface = "dark" | "light";

type LogoProps = {
  variant?: LogoVariant;
  surface?: LogoSurface;
  tagline?: boolean;
  decorative?: boolean;
  priority?: boolean;
  className?: string;
  sizes?: string;
};

const assets = {
  dark: {
    monogram: "/brand/merchantflare-monogram-on-dark.svg",
    wordmark: "/brand/merchantflare-wordmark-on-dark.svg",
  },
  light: {
    monogram: "/brand/merchantflare-monogram-on-light.svg",
    wordmark: "/brand/merchantflare-wordmark-on-light.svg",
  },
} as const;

function classes(...names: Array<string | false | undefined>) {
  return names.filter(Boolean).join(" ");
}

export function Logo({
  variant = "horizontal",
  surface = "dark",
  tagline = false,
  decorative = false,
  priority = false,
  className,
  sizes,
}: LogoProps) {
  const asset = assets[surface];
  const alt = decorative ? "" : "MerchantFlare";

  if (variant === "monogram") {
    return (
      <span
        className={classes(styles.logo, styles.monogramOnly, className)}
        data-surface={surface}
        aria-hidden={decorative || undefined}
      >
        <Image
          className={styles.monogram}
          src={asset.monogram}
          alt={alt}
          width={128}
          height={128}
          priority={priority}
          sizes={sizes}
        />
      </span>
    );
  }

  if (variant === "wordmark") {
    return (
      <span
        className={classes(styles.logo, styles.wordmarkOnly, className)}
        data-surface={surface}
        aria-hidden={decorative || undefined}
      >
        <Image
          className={styles.wordmark}
          src={asset.wordmark}
          alt={alt}
          width={590}
          height={48}
          priority={priority}
          sizes={sizes}
        />
        {tagline ? <span className={styles.tagline}>Commerce Intelligence Platform</span> : null}
      </span>
    );
  }

  return (
    <span
      className={classes(styles.logo, styles.horizontal, className)}
      data-surface={surface}
      aria-hidden={decorative || undefined}
    >
      <span className={styles.lockup}>
        <Image
          className={styles.monogram}
          src={asset.monogram}
          alt=""
          width={128}
          height={128}
          priority={priority}
          sizes={sizes}
        />
        <span className={styles.divider} aria-hidden="true" />
        <Image
          className={styles.wordmark}
          src={asset.wordmark}
          alt={alt}
          width={590}
          height={48}
          priority={priority}
          sizes={sizes}
        />
      </span>
      {tagline ? <span className={styles.tagline}>Commerce Intelligence Platform</span> : null}
    </span>
  );
}
