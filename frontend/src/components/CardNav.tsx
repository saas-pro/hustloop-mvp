import React, { useState, useEffect } from 'react';
import Image from 'next/image';
// use your own icon import if react-icons is not available
import { GoArrowUpRight } from 'react-icons/go';

type CardNavLink = {
  label: string;
  href: string;
  ariaLabel: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  isHighlighted?: boolean; // For special styling like Early Bird
  styleVariant?: 'primary' | 'secondary' | 'default'; // For auth buttons styling
  icon?: React.ReactNode; // Optional icon to display with the link
  iconOnly?: boolean; // If true, only show the icon without the label
};

export type CardNavItem = {
  label: string;
  bgColor: string;
  textColor: string;
  links: CardNavLink[];
  isHorizontal?: boolean;
};

export interface CardNavProps {
  logo?: string;
  logoAlt?: string;
  brandLogo?: React.ReactElement;
  items: CardNavItem[];
  className?: string;
  ease?: string;
  baseColor?: string;
  menuColor?: string;
  buttonBgColor?: string;
  buttonTextColor?: string;
  themeToggle?: React.ReactElement;
  onMenuToggle?: (isOpen: boolean) => void;
}

const CardNav: React.FC<CardNavProps> = ({
  logo,
  logoAlt = 'Logo',
  brandLogo,
  items,
  className = '',
  ease = 'power3.out',
  baseColor = '#fff',
  menuColor,
  buttonBgColor,
  buttonTextColor,
  themeToggle,
  onMenuToggle
}) => {
  const [isHamburgerOpen, setIsHamburgerOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleScroll = () => {
        const currentScrollY = window.scrollY;

        if (currentScrollY <= 50) {
          setIsVisible(true);
        } else if (currentScrollY > lastScrollY) {
          // Scrolling down
          if (!isExpanded) {
            setIsVisible(false);
          }
        } else {
          // Scrolling up
          setIsVisible(true);
        }

        setLastScrollY(currentScrollY);
      };

      window.addEventListener('scroll', handleScroll, { passive: true });
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, [lastScrollY, isExpanded]);

  const toggleMenu = () => {
    if (!isExpanded) {
      setIsHamburgerOpen(true);
      setIsExpanded(true);
      onMenuToggle?.(true);
    } else {
      setIsHamburgerOpen(false);
      setIsExpanded(false);
      onMenuToggle?.(false);
    }
  };

  useEffect(() => {
    const mainView = document.getElementById('for-nav');
    if (mainView) {
      if (isExpanded) {
        mainView.style.setProperty('overflow', 'hidden', 'important');
      } else {
        mainView.style.removeProperty('overflow');
      }
    }

    return () => {
      const cleanupMainView = document.getElementById('main-view');
      if (cleanupMainView) {
        cleanupMainView.style.removeProperty('overflow');
      }
    };
  }, [isExpanded]);

  return (
    <div
      className={`card-nav-container fixed left-1/2 w-[92dvw] max-w-[800px] z-[99] top-[1.2em] md:top-[2em] pointer-events-auto transition-transform duration-300 ${isVisible ? '-translate-x-1/2 translate-y-0' : '-translate-x-1/2 -translate-y-[150%]'} ${className}`}
    >
      <nav
        className={`card-nav block p-0 rounded-xl shadow-md relative overflow-hidden bg-card/60 backdrop-blur-2xl border border-border transition-[max-height] duration-500 ease-in-out ${isExpanded ? 'max-h-[calc(100vh-40px)] open' : 'max-h-[60px]'}`}
      >
        <div className="card-nav-top relative w-full h-[60px] flex items-center justify-between p-2 pl-[1.1rem] z-[2]">
          <div className="flex items-center order-1 md:order-none">
            {brandLogo ? brandLogo : logo ? <Image src={logo} alt={logoAlt} width={100} height={28} className="logo h-[28px] w-auto" /> : null}
          </div>

          <div className="flex items-center gap-0 order-2 md:order-none mr-2 ml-auto">
            {themeToggle && (
              <div className="theme-toggle-container mr-2">
                {themeToggle}
              </div>
            )}
            <div
              className={`hamburger-menu ${isHamburgerOpen ? 'open' : ''} group h-full flex flex-col items-center justify-center cursor-pointer gap-[6px] text-foreground`}
              onClick={toggleMenu}
              role="button"
              aria-label={isExpanded ? 'Close menu' : 'Open menu'}
              tabIndex={0}
            >
              <div
                className={`hamburger-line w-[25px] h-[2px] bg-current transition-[transform,opacity,margin] duration-300 ease-linear [transform-origin:50%_50%] ${isHamburgerOpen ? 'translate-y-[4px] rotate-45' : ''
                  } group-hover:opacity-75`}
              />
              <div
                className={`hamburger-line w-[25px] h-[2px] bg-current transition-[transform,opacity,margin] duration-300 ease-linear [transform-origin:50%_50%] ${isHamburgerOpen ? '-translate-y-[4px] -rotate-45' : ''
                  } group-hover:opacity-75`}
              />
            </div>
          </div>
        </div>

        <div
          className={`card-nav-content w-full p-3 flex flex-col justify-between z-[1] overflow-y-auto max-h-[calc(100vh-100px)] transition-opacity duration-300 delay-150 ${isExpanded ? 'opacity-100 visible pointer-events-auto' : 'opacity-0 invisible pointer-events-none'
            }`}
          aria-hidden={!isExpanded}
        >
          {(() => {
            let linkIndex = 0; // Track global link index across all sections
            const allSections = (items || []).map((item, idx) => {
              const sectionLinks = item.links?.map((lnk, i) => {
                const currentIndex = linkIndex++;
                return (
                  <a
                    key={`${lnk.label}-${i}`}
                    className={`nav-link text-base transition-all duration-200 cursor-pointer ${lnk.iconOnly
                      ? 'flex items-center justify-center w-12 h-12 p-0'
                      : lnk.icon
                        ? 'flex items-center justify-between px-4 py-2'
                        : 'block px-4 py-2'
                        } ${lnk.styleVariant === 'primary'
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90 font-medium rounded-full text-center'
                        : lnk.styleVariant === 'secondary'
                          ? 'bg-secondary text-secondary-foreground hover:bg-secondary/80 font-medium rounded-full text-center'
                          : lnk.isHighlighted
                            ? 'bg-primary text-primary-foreground hover:bg-primary/90 font-medium rounded-md'
                            : 'text-muted-foreground hover:text-primary hover:bg-accent/50 rounded-md'
                      }`}
                    href={lnk.href}
                    aria-label={lnk.ariaLabel}
                    onClick={(e) => {
                      // Call the original onClick handler if it exists
                      if (lnk.onClick) {
                        lnk.onClick(e);
                      }
                      // Close the menu after clicking any link
                      if (isExpanded) {
                        toggleMenu();
                      }
                    }}
                  >
                    {lnk.iconOnly ? (
                      lnk.icon
                    ) : (
                      <>
                        <span>{lnk.label}</span>
                        {lnk.icon && <span className="icon">{lnk.icon}</span>}
                      </>
                    )
                    }
                  </a>
                );
              });

              // Check if all links in this section are icon-only
              const allIconOnly = item.links?.every(lnk => lnk.iconOnly) ?? false;

              return (
                <div
                  key={`${item.label}-${idx}`}
                  className={`nav-section ${allIconOnly ? 'flex flex-row items-center justify-between gap-2' : item.isHorizontal ? 'grid grid-cols-2 gap-2 mt-2' : 'flex flex-col gap-[2px]'}`}
                >
                  {sectionLinks}
                </div>
              );
            });

            // Split sections: all except last go in top group, last goes at bottom
            const topSections = allSections.slice(0, -1);
            const bottomSection = allSections[allSections.length - 1];

            return (
              <>
                <div className="flex flex-col gap-1">
                  {topSections.map((section, idx) => (
                    <React.Fragment key={idx}>
                      {section}
                      {idx === 0 && <div className="my-2 border-t border-border" />}
                    </React.Fragment>
                  ))}
                </div>
                {bottomSection && (
                  <div className="mt-2 pt-2 border-border">
                    {bottomSection}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </nav >
    </div >
  );
};

export default CardNav;
