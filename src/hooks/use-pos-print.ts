
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
                        <style>
                            @page { size: 80mm auto; margin: 0; }
                            body { margin: 0; font-family: 'PT Sans', sans-serif !important; direction: rtl; color: black !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                            * { color: black !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; font-family: 'PT Sans', sans-serif !important; }
                            .lucide { display: inline-block; width: 1em; height: 1em; stroke-width: 2; stroke: currentColor; fill: none; }
                            .text-primary { color: hsl(197 71% 53%) !important; }
                            .bg-gradient-to-br { background-image: linear-gradient(to bottom right, #eff6ff, #e0e7ff) !important; }
                            .border-dashed { border-style: dashed !important; }
                            .rounded-2xl { border-radius: 1rem !important; }
                            .rounded-full { border-radius: 9999px !important; }
                            .p-4 { padding: 1rem !important; }
                            .m-2 { margin: 0.5rem !important; }
                            .mb-4 { margin-bottom: 1rem !important; }
                            .pb-2 { padding-bottom: 0.5rem !important; }
                            .border-b-2 { border-bottom-width: 2px !important; }
                            .border-gray-300 { border-color: #d1d5db !important; }
                            .border-4 { border-width: 4px !important; }
                            .border-gray-400 { border-color: #9ca3af !important; }
                            .text-center { text-align: center !important; }
                            .text-right { text-align: right !important; }
                            .flex { display: flex !important; }
                            .justify-center { justify-content: center !important; }
                            .items-center { align-items: center !important; }
                            .gap-2 { gap: 0.5rem !important; }
                            .gap-3 { gap: 0.75rem !important; }
                            .w-8 { width: 2rem !important; }
                            .h-8 { height: 2rem !important; }
                            .w-16 { width: 4rem !important; }
                            .h-16 { height: 4rem !important; }
                            .w-full { width: 100% !important; }
                            .text-xl { font-size: 1.25rem !important; line-height: 1.75rem !important; }
                            .text-lg { font-size: 1.125rem !important; line-height: 1.75rem !important; }
                            .text-md { font-size: 1rem !important; line-height: 1.5rem !important; }
                            .text-sm { font-size: 0.875rem !important; line-height: 1.25rem !important; }
                            .text-xs { font-size: 0.75rem !important; line-height: 1rem !important; }
                            .font-bold { font-weight: 700 !important; }
                            .font-semibold { font-weight: 600 !important; }
                            .text-gray-500 { color: #6b7280 !important; }
                            .text-gray-600 { color: #4b5563 !important; }
                            .bg-gray-200 { background-color: #e5e7eb !important; }
                            .space-y-4 > *:not([hidden]) ~ *:not([hidden]) { margin-top: 1rem !important; }
                            .mt-4 { margin-top: 1rem !important; }
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
