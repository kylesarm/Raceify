/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, ChangeEvent, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { generateEthnicityImage } from './services/geminiService';
import PolaroidCard from './components/PolaroidCard';
import { createAlbumPage } from './lib/albumUtils';
import Footer from './components/Footer';

const ETHNICITIES = [
    'East Asian',
    'South East Asian',
    'South Asian',
    'Black',
    'White',
    'Middle Eastern',
    'Hispanic',
    'Native American'
];

const ETHNICITY_PROMPT_MAP: Record<string, string> = {
    'East Asian': "Take the face of the person in the uploaded image and realistically transform their features to appear ethnically East Asian (e.g., Chinese, Japanese, Korean). The result should be a high-quality, respectful portrait photograph that maintains the person's core identity. The background should be neutral.",
    'South East Asian': "Take the face of the person in the uploaded image and realistically transform their features to appear ethnically South East Asian (e.g., Filipino, Vietnamese, Thai). The result should be a high-quality, respectful portrait photograph that maintains the person's core identity. The background should be neutral.",
    'South Asian': "Take the face of the person in the uploaded image and realistically transform their features to appear ethnically South Asian (e.g., Indian, Pakistani, Bangladeshi). The result should be a high-quality, respectful portrait photograph that maintains the person's core identity. The background should be neutral.",
    'Black': "Take the face of the person in the uploaded image and realistically transform their features to appear ethnically Black (e.g., of African descent). The result should be a high-quality, respectful portrait photograph that maintains the person's core identity. The background should be neutral.",
    'White': "Take the face of the person in the uploaded image and realistically transform their features to appear ethnically White (e.g., of European descent). The result should be a high-quality, respectful portrait photograph that maintains the person's core identity. The background should be neutral.",
    'Middle Eastern': "Take the face of the person in the uploaded image and realistically transform their features to appear ethnically Middle Eastern. The result should be a high-quality, respectful portrait photograph that maintains the person's core identity. The background should be neutral.",
    'Hispanic': "Take the face of the person in the uploaded image and realistically transform their features to appear ethnically Hispanic/Latino. The result should be a high-quality, respectful portrait photograph that maintains the person's core identity. The background should be neutral.",
    'Native American': "Take the face of the person in the uploaded image and realistically transform their features to appear ethnically Native American. The result should be a high-quality, respectful portrait photograph that maintains the person's core identity. The background should be neutral."
};


// Pre-defined positions for a scattered look on desktop
const POSITIONS = [
    { top: '2%', left: '10%', rotate: -10 },
    { top: '5%', left: '40%', rotate: 5 },
    { top: '0%', left: '70%', rotate: -8 },
    { top: '40%', left: '0%', rotate: 12 },
    { top: '45%', left: '25%', rotate: 8 },
    { top: '35%', left: '55%', rotate: -5 },
    { top: '42%', left: '80%', rotate: 10 },
    { top: '70%', left: '40%', rotate: -15 },
];

const GHOST_POLAROIDS_CONFIG = [
  { initial: { x: "-150%", y: "-100%", rotate: -30 }, transition: { delay: 0.2 } },
  { initial: { x: "150%", y: "-80%", rotate: 25 }, transition: { delay: 0.4 } },
  { initial: { x: "-120%", y: "120%", rotate: 45 }, transition: { delay: 0.6 } },
  { initial: { x: "180%", y: "90%", rotate: -20 }, transition: { delay: 0.8 } },
  { initial: { x: "0%", y: "-200%", rotate: 0 }, transition: { delay: 0.5 } },
  { initial: { x: "100%", y: "150%", rotate: 10 }, transition: { delay: 0.3 } },
  { initial: { x: "-200%", y: "0%", rotate: 15 }, transition: { delay: 0.7 } },
  { initial: { x: "200%", y: "20%", rotate: -15 }, transition: { delay: 0.9 } },
];


type ImageStatus = 'pending' | 'done' | 'error';
interface GeneratedImage {
    status: ImageStatus;
    url?: string;
    error?: string;
}

const primaryButtonClasses = "font-permanent-marker text-xl text-center text-black bg-yellow-400 py-3 px-8 rounded-sm transform transition-transform duration-200 hover:scale-105 hover:-rotate-2 hover:bg-yellow-300 shadow-[2px_2px_0px_2px_rgba(0,0,0,0.2)]";
const secondaryButtonClasses = "font-permanent-marker text-xl text-center text-white bg-white/10 backdrop-blur-sm border-2 border-white/80 py-3 px-8 rounded-sm transform transition-transform duration-200 hover:scale-105 hover:rotate-2 hover:bg-white hover:text-black";

const useMediaQuery = (query: string) => {
    const [matches, setMatches] = useState(false);
    useEffect(() => {
        const media = window.matchMedia(query);
        if (media.matches !== matches) {
            setMatches(media.matches);
        }
        const listener = () => setMatches(media.matches);
        window.addEventListener('resize', listener);
        return () => window.removeEventListener('resize', listener);
    }, [matches, query]);
    return matches;
};

function App() {
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [generatedImages, setGeneratedImages] = useState<Record<string, GeneratedImage>>({});
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isDownloading, setIsDownloading] = useState<boolean>(false);
    const [appState, setAppState] = useState<'idle' | 'image-uploaded' | 'generating' | 'results-shown'>('idle');
    const dragAreaRef = useRef<HTMLDivElement>(null);
    const isMobile = useMediaQuery('(max-width: 768px)');


    const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                setUploadedImage(reader.result as string);
                setAppState('image-uploaded');
                setGeneratedImages({}); // Clear previous results
            };
            reader.readAsDataURL(file);
        }
    };

    const handleGenerateClick = async () => {
        if (!uploadedImage) return;

        setIsLoading(true);
        setAppState('generating');
        
        const initialImages: Record<string, GeneratedImage> = {};
        ETHNICITIES.forEach(ethnicity => {
            initialImages[ethnicity] = { status: 'pending' };
        });
        setGeneratedImages(initialImages);

        const concurrencyLimit = 2; // Process two ethnicities at a time
        const ethnicitiesQueue = [...ETHNICITIES];

        const processEthnicity = async (ethnicity: string) => {
            try {
                const prompt = ETHNICITY_PROMPT_MAP[ethnicity];
                const resultUrl = await generateEthnicityImage(uploadedImage, prompt, ethnicity);
                setGeneratedImages(prev => ({
                    ...prev,
                    [ethnicity]: { status: 'done', url: resultUrl },
                }));
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
                setGeneratedImages(prev => ({
                    ...prev,
                    [ethnicity]: { status: 'error', error: errorMessage },
                }));
                console.error(`Failed to generate image for ${ethnicity}:`, err);
            }
        };

        const workers = Array(concurrencyLimit).fill(null).map(async () => {
            while (ethnicitiesQueue.length > 0) {
                const ethnicity = ethnicitiesQueue.shift();
                if (ethnicity) {
                    await processEthnicity(ethnicity);
                }
            }
        });

        await Promise.all(workers);

        setIsLoading(false);
        setAppState('results-shown');
    };

    const handleRegenerateEthnicity = async (ethnicity: string) => {
        if (!uploadedImage) return;

        // Prevent re-triggering if a generation is already in progress
        if (generatedImages[ethnicity]?.status === 'pending') {
            return;
        }
        
        console.log(`Regenerating image for ${ethnicity}...`);

        // Set the specific ethnicity to 'pending' to show the loading spinner
        setGeneratedImages(prev => ({
            ...prev,
            [ethnicity]: { status: 'pending' },
        }));

        // Call the generation service for the specific ethnicity
        try {
            const prompt = ETHNICITY_PROMPT_MAP[ethnicity];
            const resultUrl = await generateEthnicityImage(uploadedImage, prompt, ethnicity);
            setGeneratedImages(prev => ({
                ...prev,
                [ethnicity]: { status: 'done', url: resultUrl },
            }));
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            setGeneratedImages(prev => ({
                ...prev,
                [ethnicity]: { status: 'error', error: errorMessage },
            }));
            console.error(`Failed to regenerate image for ${ethnicity}:`, err);
        }
    };
    
    const handleReset = () => {
        setUploadedImage(null);
        setGeneratedImages({});
        setAppState('idle');
    };

    const handleDownloadIndividualImage = (ethnicity: string) => {
        const image = generatedImages[ethnicity];
        if (image?.status === 'done' && image.url) {
            const link = document.createElement('a');
            link.href = image.url;
            link.download = `raceify-${ethnicity.toLowerCase().replace(/ /g, '-')}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const handleDownloadAlbum = async () => {
        setIsDownloading(true);
        try {
            const imageData = (Object.entries(generatedImages) as [string, GeneratedImage][])
                .filter(([, image]) => image.status === 'done' && image.url)
                .reduce((acc, [ethnicity, image]) => {
                    acc[ethnicity] = image.url!;
                    return acc;
                }, {} as Record<string, string>);

            if (Object.keys(imageData).length < ETHNICITIES.length) {
                alert("Please wait for all images to finish generating before downloading the album.");
                return;
            }

            const albumDataUrl = await createAlbumPage(imageData);

            const link = document.createElement('a');
            link.href = albumDataUrl;
            link.download = 'raceify-album.jpg';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        } catch (error) {
            console.error("Failed to create or download album:", error);
            alert("Sorry, there was an error creating your album. Please try again.");
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <main className="bg-black text-neutral-200 min-h-screen w-full flex flex-col items-center justify-center p-4 pb-24 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-full bg-grid-white/[0.05]"></div>
            
            <div className="z-10 flex flex-col items-center justify-center w-full h-full flex-1 min-h-0">
                <div className="text-center mb-10">
                    <h1 className="text-6xl md:text-8xl font-caveat font-bold text-neutral-100">Raceify</h1>
                    <p className="font-permanent-marker text-neutral-400 mt-2 text-lg tracking-wide">Developed by Kyle Anthony Sarmiento</p>
                </div>

                {appState === 'idle' && (
                     <div className="relative flex flex-col items-center justify-center w-full">
                        {/* Ghost polaroids for intro animation */}
                        {GHOST_POLAROIDS_CONFIG.map((config, index) => (
                             <motion.div
                                key={index}
                                className="absolute w-80 h-[26rem] rounded-md p-4 bg-neutral-100/10 blur-sm"
                                initial={config.initial}
                                animate={{
                                    x: "0%", y: "0%", rotate: (Math.random() - 0.5) * 20,
                                    scale: 0,
                                    opacity: 0,
                                }}
                                transition={{
                                    ...config.transition,
                                    ease: "circOut",
                                    duration: 2,
                                }}
                            />
                        ))}
                        <motion.div
                             initial={{ opacity: 0, scale: 0.8 }}
                             animate={{ opacity: 1, scale: 1 }}
                             transition={{ delay: 2, duration: 0.8, type: 'spring' }}
                             className="flex flex-col items-center"
                        >
                            <label htmlFor="file-upload" className="cursor-pointer group transform hover:scale-105 transition-transform duration-300">
                                 <PolaroidCard 
                                     caption="Upload Your Photo"
                                     status="done"
                                 />
                            </label>
                            <input id="file-upload" type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={handleImageUpload} />
                            <p className="mt-8 font-permanent-marker text-neutral-500 text-center max-w-xs text-lg">
                                Click the polaroid to upload your photo and explore different heritages.
                            </p>
                        </motion.div>
                    </div>
                )}

                {appState === 'image-uploaded' && uploadedImage && (
                    <div className="flex flex-col items-center gap-6">
                         <PolaroidCard 
                            imageUrl={uploadedImage} 
                            caption="Your Photo" 
                            status="done"
                         />
                         <div className="flex items-center gap-4 mt-4">
                            <button onClick={handleReset} className={secondaryButtonClasses}>
                                Different Photo
                            </button>
                            <button onClick={handleGenerateClick} className={primaryButtonClasses}>
                                Explore
                            </button>
                         </div>
                    </div>
                )}

                {(appState === 'generating' || appState === 'results-shown') && (
                     <>
                        {isMobile ? (
                            <div className="w-full max-w-sm flex-1 overflow-y-auto mt-4 space-y-8 p-4">
                                {ETHNICITIES.map((ethnicity) => (
                                    <div key={ethnicity} className="flex justify-center">
                                         <PolaroidCard
                                            caption={ethnicity}
                                            status={generatedImages[ethnicity]?.status || 'pending'}
                                            imageUrl={generatedImages[ethnicity]?.url}
                                            error={generatedImages[ethnicity]?.error}
                                            onShake={handleRegenerateEthnicity}
                                            onDownload={handleDownloadIndividualImage}
                                            isMobile={isMobile}
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div ref={dragAreaRef} className="relative w-full max-w-5xl h-[600px] mt-4">
                                {ETHNICITIES.map((ethnicity, index) => {
                                    const { top, left, rotate } = POSITIONS[index];
                                    return (
                                        <motion.div
                                            key={ethnicity}
                                            className="absolute cursor-grab active:cursor-grabbing"
                                            style={{ top, left }}
                                            initial={{ opacity: 0, scale: 0.5, y: 100, rotate: 0 }}
                                            animate={{ 
                                                opacity: 1, 
                                                scale: 1, 
                                                y: 0,
                                                rotate: `${rotate}deg`,
                                            }}
                                            transition={{ type: 'spring', stiffness: 100, damping: 20, delay: index * 0.15 }}
                                        >
                                            <PolaroidCard 
                                                dragConstraintsRef={dragAreaRef}
                                                caption={ethnicity}
                                                status={generatedImages[ethnicity]?.status || 'pending'}
                                                imageUrl={generatedImages[ethnicity]?.url}
                                                error={generatedImages[ethnicity]?.error}
                                                onShake={handleRegenerateEthnicity}
                                                onDownload={handleDownloadIndividualImage}
                                                isMobile={isMobile}
                                            />
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                         <div className="h-20 mt-4 flex items-center justify-center">
                            {appState === 'results-shown' && (
                                <div className="flex flex-col sm:flex-row items-center gap-4">
                                    <button 
                                        onClick={handleDownloadAlbum} 
                                        disabled={isDownloading} 
                                        className={`${primaryButtonClasses} disabled:opacity-50 disabled:cursor-not-allowed`}
                                    >
                                        {isDownloading ? 'Creating Album...' : 'Download Album'}
                                    </button>
                                    <button onClick={handleReset} className={secondaryButtonClasses}>
                                        Start Over
                                    </button>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
            <Footer />
        </main>
    );
}

export default App;