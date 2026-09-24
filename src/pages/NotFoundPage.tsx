import React from 'react';
import { PortalShell } from '../components/PortalShell';
import { TransitionLink } from '../components/TransitionLink';
import { EditorialHero } from '../components/EditorialHero';

export const NotFoundPage: React.FC = () => {
  return (
    <PortalShell pageSubtitle="page not found">
      <EditorialHero
        intro="error 404 ~"
        heading="Not Found"
        subtitle="Unknown Gateway Route"
        description="The requested gateway route does not exist or has been relocated."
        statusLabel="ROUTE UNRESOLVED"
      >
        <div className="pt-2">
          <TransitionLink
            to="/"
            className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-[#1A1A1A] text-[#FAF8F5] hover:bg-[#333333] text-sm font-medium transition-all duration-200 active:scale-95 shadow-sm cursor-pointer"
          >
            Return to Gateway
          </TransitionLink>
        </div>
      </EditorialHero>
    </PortalShell>
  );
};

export default NotFoundPage;
