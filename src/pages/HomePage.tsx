import React from 'react';
import { PortalShell } from '../components/PortalShell';
import { getAllRedirectDestinations } from '../config/redirects';
import { TransitionLink } from '../components/TransitionLink';
import { EditorialHero } from '../components/EditorialHero';

export const HomePage: React.FC = () => {
  const destinations = getAllRedirectDestinations();

  return (
    <PortalShell>
      <EditorialHero
        intro="hello, welcome ~"
        heading="Hi, I'm Sahaj"
        subtitle="Creative Portfolio & Direct Gateways"
        description="Personal digital gateway connecting you to code repositories, professional profiles, portfolio showcase, and verified resume."
      >
        {/* Gateway Action / Destination links with cinematic flower transitions */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          {destinations.map((dest) => (
            <TransitionLink
              key={dest.slug}
              to={`/${dest.slug}`}
              className="px-6 py-2.5 rounded-full bg-white border border-neutral-200/90 hover:border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-[#FAF8F5] text-[#1A1A1A] text-sm font-medium transition-all duration-200 shadow-sm active:scale-95 cursor-pointer"
            >
              {dest.displayName}
            </TransitionLink>
          ))}
        </div>
      </EditorialHero>
    </PortalShell>
  );
};

export default HomePage;
