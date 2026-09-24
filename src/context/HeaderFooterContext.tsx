import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';

export interface HeaderFooterConfig {
  pageSubtitle?: string;
  footerSubtitle?: string;
  headerRight?: ReactNode;
  showHeader?: boolean;
  showFooter?: boolean;
  fixedFooter?: boolean;
  stickyFooter?: boolean;
}

interface HeaderFooterContextValue {
  config: HeaderFooterConfig;
  setConfig: (config: HeaderFooterConfig) => void;
}

const defaultConfig: HeaderFooterConfig = {
  pageSubtitle: 'gateway & portfolio',
  footerSubtitle: 'personal gateway ~',
  headerRight: undefined,
  showHeader: true,
  showFooter: true,
  fixedFooter: true,
  stickyFooter: false,
};

const HeaderFooterContext = createContext<HeaderFooterContextValue>({
  config: defaultConfig,
  setConfig: () => {},
});

export const HeaderFooterProvider: React.FC<{ readonly children: ReactNode }> = ({
  children,
}) => {
  const [config, setConfig] = useState<HeaderFooterConfig>(defaultConfig);

  return (
    <HeaderFooterContext.Provider value={{ config, setConfig }}>
      {children}
    </HeaderFooterContext.Provider>
  );
};

export const useHeaderFooter = () => useContext(HeaderFooterContext);

/**
 * Hook used by pages and PortalShell to declare their header and footer requirements.
 * Updates the persistent layout-level header and footer without unmounting.
 */
export const useSetHeaderFooter = (newConfig: HeaderFooterConfig) => {
  const { setConfig } = useHeaderFooter();

  useEffect(() => {
    setConfig(newConfig);
  }, [
    newConfig.pageSubtitle,
    newConfig.footerSubtitle,
    newConfig.headerRight,
    newConfig.showHeader,
    newConfig.showFooter,
    newConfig.fixedFooter,
    newConfig.stickyFooter,
    setConfig,
  ]);
};
