/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';

const Footer = () => {
    return (
        <footer className="fixed bottom-0 left-0 right-0 bg-black/50 backdrop-blur-sm p-3 z-50 text-neutral-300 text-xs sm:text-sm border-t border-white/10">
            <div className="max-w-screen-xl mx-auto flex justify-between items-center gap-4 px-4">
                <div className="flex items-center gap-4 text-neutral-500 whitespace-nowrap">
                    <p>Powered by Gemini 2.5 Flash Image Preview</p>
                </div>
                <div className="flex-grow flex justify-end items-center text-right">
                    <p className="text-neutral-400">
                        Explore, create, and see yourself in a new light.
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;