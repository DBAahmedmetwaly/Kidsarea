

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
                         <link rel="preconnect" href="https://fonts.googleapis.com" />
                        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                        <link
                        href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap"
                        rel="stylesheet"
                        />
                        <link rel="stylesheet" href="/_next/static/css/app/globals.css" media="all">
                        <style>
                            @page { size: 80mm auto; margin: 0; }
                            body { margin: 0; font-family: 'PT Sans', sans-serif !important; direction: rtl; color: black !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                            * { color: black !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; font-family: 'PT Sans', sans-serif !important; }
                            .lucide { display: inline-block; width: 1em; height: 1em; }
                        </style>
                    </head>
                    <body>${receiptHtml}</body>
                </html>
            `);
            iframeDoc.close();

            const handleLoad = () => {
                iframe.contentWindow?.focus();
                iframe.contentWindow?.print();
                setTimeout(() => {
                    document.body.removeChild(iframe);
                }, 500); // Cleanup iframe
                iframe.removeEventListener('load', handleLoad);
            }
            iframe.addEventListener('load', handleLoad);
        }
    }, []);

    return { printReceipt };
};
