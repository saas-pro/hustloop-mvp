"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function ZohoChatbot() {
    const pathname = usePathname();
    const isBlog = pathname?.startsWith("/blog");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        try {
            if (typeof window !== "undefined" && (window as any).$zoho?.salesiq) {
                const zoho = (window as any).$zoho.salesiq;

                if (isBlog) {
                    zoho.floatwindow.visible("hide");
                    zoho.chatwindow.close?.();
                    zoho.widget.hide?.();
                } else {
                    zoho.widget.show?.();
                    zoho.floatwindow.visible("show");
                    zoho.chatwindow.close?.();
                }
            }
        } catch (e) { }
    }, [isBlog, pathname]);

    if (!mounted) return null;

    return (
        <>
            {isBlog && (
                <style dangerouslySetInnerHTML={{
                    __html: `
                    #zsiq_float, 
                    #zsiq_mfloat,
                    .zsiq_floatmain,
                    .zsiq_theme1,
                    [id^="zsiq"] { 
                        display: none !important; 
                        opacity: 0 !important;
                        pointer-events: none !important;
                        z-index: -9999 !important;
                    }
                ` }} />
            )}

            <Script id="zoho-salesiq-script" strategy="lazyOnload">
                {`
                window.$zoho = window.$zoho || {};
                window.$zoho.salesiq = window.$zoho.salesiq || {
                  widgetcode: "siq770fac757336897d739f9273d8f8f7b3aec5f63c512be52582e5f9e3440d863b",
                  values: {},
                  ready: function () {
                    var salesiqDoc = document.getElementById("zsiq_float");
                    if (salesiqDoc) {
                        document.addEventListener('router:end', (event) => {
                            if (window.$zoho && window.$zoho.salesiq && window.$zoho.salesiq.page) {
                                window.$zoho.salesiq.page.popup.close();
                            }
                        });
                    }
                  }
                };
                
                var d = document;
                var s = d.createElement("script");
                s.type = "text/javascript";
                s.id = "zsiqscript";
                s.defer = true;
                s.src = "https://salesiq.zohopublic.in/widget";
                var t = d.getElementsByTagName("script")[0];
                t.parentNode.insertBefore(s, t);
              `}
            </Script>
        </>
    );
}
