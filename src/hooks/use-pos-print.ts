
'use client';

import { useRef, useCallback } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

export const usePosPrint = (receiptComponent: React.ReactElement) => {
    const iframeRef = useRef<HTMLIFrameElement | null>(null);

    const print = useCallback(() => {
        const receiptHtml = renderToStaticMarkup(receiptComponent);
        
        // Create an iframe dynamically
        const iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = 'none';
        iframe.style.visibility = 'hidden';

        document.body.appendChild(iframe);
        iframeRef.current = iframe;

        const iframeDoc = iframe.contentWindow?.document;
        if (iframeDoc) {
            iframeDoc.open();
            iframeDoc.write(`
                <html>
                    <head>
                        <title>Print Receipt</title>
                        <link rel="stylesheet" href="/_next/static/css/app/layout.css" media="all">
                        <style>
                            @page { size: 80mm auto; margin: 0; }
                            body { margin: 0; font-family: 'PT Sans', sans-serif; direction: rtl; }
                            .lucide { display: inline-block; width: 1em; height: 1em; }
                        </style>
                    </head>
                    <body>${receiptHtml}</body>
                </html>
            `);
            iframeDoc.close();

            iframe.onload = () => {
                iframe.contentWindow?.focus();
                iframe.contentWindow?.print();
                 // Clean up the iframe after printing
                setTimeout(() => {
                    document.body.removeChild(iframe);
                    iframeRef.current = null;
                }, 500);
            };
        }
    }, [receiptComponent]);

    return { print };
};
