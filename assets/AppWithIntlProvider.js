import React, { useState } from "react";
import { IntlProvider } from "react-intl";
import pl from "./translations/pl.json";
import en from "./translations/en.json";

import Bible from "./js/Bible";

const translations = {
    pl,
    en
};

export default function AppWithIntlProvider({children}) {
    const [locale, setLocale] = useState('pl');
    
    return (
        <IntlProvider locale={locale} messages={translations[locale]}>
            <Bible setLocale={setLocale} />
        </IntlProvider>
    );
}
