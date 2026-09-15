import type { AnchorHTMLAttributes, MouseEvent } from "react";

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
};

export default function Link({ href, onClick, children, ...rest }: LinkProps) {
  return (
    <a
      href={href}
      {...rest}
      onClick={(event: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        event.preventDefault();
        window.location.assign(href);
      }}
    >
      {children}
    </a>
  );
}
