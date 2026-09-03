import Image from 'next/image';
import { useId, type CSSProperties } from 'react';

export type MintMusicLogoVariant =
  | 'core-paper'
  | 'core-studio'
  | 'core-charcoal'
  | 'core-onyx'
  | 'signature-mint-metal'
  | 'signature-forest'
  | 'signature-ivory'
  | 'signature-slate'
  | 'bonus-gold'
  | 'bonus-gold-light'
  | 'bonus-chrome'
  | 'bonus-embossed';

type MintMusicMarkProps = {
  variant?: MintMusicLogoVariant;
  markOnly?: boolean;
  decorative?: boolean;
  interactive?: boolean;
  className?: string;
};

export default function MintMusicMark({
  variant = 'core-onyx',
  markOnly = false,
  decorative = true,
  interactive = false,
  className = '',
}: MintMusicMarkProps) {
  const gradientId = useId().replaceAll(':', '');
  const titleId = `${gradientId}-title`;
  const style = { '--mm-disc-gradient': `url(#${gradientId})` } as CSSProperties;
  const isCoreVariant = variant.startsWith('core-');
  const isLightCoreVariant = variant === 'core-paper' || variant === 'core-studio';

  return (
    <span
      className={[
        'mm-logo',
        `mm-logo--${variant}`,
        isCoreVariant ? 'mm-logo--asset' : '',
        markOnly ? 'mm-logo--mark-only' : '',
        interactive ? 'mm-disc-interactive' : '',
        className,
      ].join(' ')}
      style={style}
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : 'MintMusic'}
    >
      <span className="mm-logo__disc-wrap">
        {isCoreVariant ? (
          <Image
            className="mm-logo__disc mm-logo__disc--asset"
            src="/brand/disc-core.png"
            width={880}
            height={879}
            alt=""
            priority={variant === 'core-onyx'}
          />
        ) : (
          <svg className="mm-logo__disc" viewBox="0 0 120 120" focusable="false">
            {decorative ? null : <title id={titleId}>MintMusic</title>}
            <defs>
              <linearGradient id={gradientId} x1="16" y1="10" x2="104" y2="110" gradientUnits="userSpaceOnUse">
                <stop stopColor="var(--mm-logo-disc-start)" />
                <stop offset="0.48" stopColor="var(--mm-logo-disc)" />
                <stop offset="1" stopColor="var(--mm-logo-disc-end)" />
              </linearGradient>
            </defs>
            <circle className="mm-logo__record-shadow" cx="60" cy="60" r="56" />
            <circle className="mm-logo__record" cx="60" cy="60" r="54" />
            <g className="mm-logo__grooves" fill="none">
              <circle cx="60" cy="60" r="47" />
              <circle cx="60" cy="60" r="42" />
              <circle cx="60" cy="60" r="36" />
            </g>
            <circle className="mm-logo__label" cx="60" cy="60" r="25" />
            <g className="mm-logo__icon">
              <path d="M60 34c13 9 20 18 20 29 0 12-8 20-20 24-12-4-20-12-20-24 0-11 7-20 20-29Z" />
              <path
                d="M46 61v7m4-13v19m5-25v29m5-34v42m5-35v27m5-22v17m5-12v7M60 84v7"
                fill="none"
              />
            </g>
            <circle className="mm-logo__spindle" cx="60" cy="60" r="1.8" />
          </svg>
        )}
      </span>

      {markOnly ? null : (
        <span className="mm-logo__wordmark" aria-hidden="true">
          {isCoreVariant ? (
            <Image
              className="mm-logo__wordmark-asset"
              src={isLightCoreVariant ? '/brand/wordmark-core-light.png' : '/brand/wordmark-core-dark.png'}
              width={isLightCoreVariant ? 584 : 474}
              height={isLightCoreVariant ? 104 : 88}
              alt=""
              priority={variant === 'core-onyx'}
            />
          ) : (
            <>
              <span className="mm-logo__mint">mint</span>
              <span className="mm-logo__music">music</span>
            </>
          )}
        </span>
      )}
    </span>
  );
}
