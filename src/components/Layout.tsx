import React, { ReactNode } from 'react';
import { PortalShell } from './PortalShell';

interface LayoutProps {
  readonly children: ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return <PortalShell>{children}</PortalShell>;
};

export default Layout;
