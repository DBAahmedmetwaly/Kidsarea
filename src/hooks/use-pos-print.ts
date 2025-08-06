

'use client';

import { useCallback } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

export const usePosPrint = () => {

    const printReceipt = useCallback((receiptComponent: React.ReactElement) => {
        const receiptHtml = renderToStaticMarkup(receiptComponent);
        
        const iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = 'none';
        iframe.style.visibility = 'hidden';
        document.body.appendChild(iframe);

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
                setTimeout(() => {
                    document.body.removeChild(iframe);
                }, 500); // Cleanup iframe
            };
        }
    }, []);

    return { printReceipt };
};
