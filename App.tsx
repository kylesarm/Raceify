/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, ChangeEvent, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { generateTransformedImage } from './services/geminiService';
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

const CREATIVE_THEMES = [
    "Cartoon", "Cyborg", "Fantasy Elf", "Vampire", "Steampunk", "Pop Art", "Claymation", "Pixel Art"
];

const PROMPT_MAPS = {
    ethnicities: {
        'East Asian': "Take the face of the person in the uploaded image and realistically transform their features to appear ethnically East Asian (e.g., Chinese, Japanese, Korean). The result should be a high-quality, respectful portrait photograph that maintains the person's core identity. The background should be neutral.",
        'South East Asian': "Take the face of the person in the uploaded image and realistically transform their features to appear ethnically South East Asian (e.g., Filipino, Vietnamese, Thai). The result should be a high-quality, respectful portrait photograph that maintains the person's core identity. The background should be neutral.",
        'South Asian': "Take the face of the person in the uploaded image and realistically transform their features to appear ethnically South Asian (e.g., Indian, Pakistani, Bangladeshi). The result should be a high-quality, respectful portrait photograph that maintains the person's core identity. The background should be neutral.",
        'Black': "Take the face of the person in the uploaded image and realistically transform their features to appear ethnically Black (e.g., of African descent). The result should be a high-quality, respectful portrait photograph that maintains the person's core identity. The background should be neutral.",
        'White': "Take the face of the person in the uploaded image and realistically transform their features to appear ethnically White (e.g., of European descent). The result should be a high-quality, respectful portrait photograph that maintains the person's core identity. The background should be neutral.",
        'Middle Eastern': "Take the face of the person in the uploaded image and realistically transform their features to appear ethnically Middle Eastern. The result should be a high-quality, respectful portrait photograph that maintains the person's core identity. The background should be neutral.",
        'Hispanic': "Take the face of the person in the uploaded image and realistically transform their features to appear ethnically Hispanic/Latino. The result should be a high-quality, respectful portrait photograph that maintains the person's core identity. The background should be neutral.",
        'Native American': "Take the face of the person in the uploaded image and realistically transform their features to appear ethnically Native American. The result should be a high-quality, respectful portrait photograph that maintains the person's core identity. The background should be neutral."
    },
    creative: {
        'Cartoon': "Redraw the person in the image in a modern 3D animated movie style, like Pixar or Disney. Exaggerate features for expressiveness but keep them clearly recognizable. The result should be a high-quality, vibrant character portrait against a simple, complementary background.",
        'Cyborg': "Transform the person in the image into a cyborg. Integrate subtle, realistic cybernetic enhancements onto their face, like glowing optic sensors or metallic plating, while preserving their core facial structure. The style should be a high-quality, cinematic portrait.",
        'Fantasy Elf': "Reimagine the person in the image as a fantasy elf. Give them gracefully pointed ears, intricate ethereal features, and perhaps subtle fantasy-style markings. Maintain their core likeness in a high-quality, majestic portrait against a mystical forest backdrop.",
        'Vampire': "Transform the person in the image into a sophisticated, gothic vampire. Give them subtly pointed canines, pale skin, and intense, captivating eyes. The style should be a high-quality, atmospheric portrait with dramatic, dark lighting.",
        'Steampunk': "Reimagine the person in the image in a Steampunk style. Adorn them with intricate Victorian-era clothing, brass goggles, and clockwork-inspired accessories. The result should be a high-quality, detailed portrait with a vintage, sepia-toned finish.",
        'Pop Art': "Convert the portrait of the person in the image into a vibrant Pop Art piece, in the style of Andy Warhol. Use bold, contrasting colors, heavy outlines, and a halftone dot pattern. The result should be a single, dynamic, high-quality panel.",
        'Claymation': "Recreate the person in the image as a stop-motion claymation character. The style should be charmingly handmade, with visible thumbprints and textures in the clay. The result should be a high-quality, playful portrait against a simple, crafted background.",
        'Pixel Art': "Transform the person in the image into a detailed 16-bit pixel art character portrait. The style should be reminiscent of classic video games, using a limited color palette but capturing their likeness effectively. The result should be a high-quality, crisp pixel art piece.",
    }
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
type GenerationMode = 'ethnicities' | 'creative';

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
    const [generationMode, setGenerationMode] = useState<GenerationMode | null>(null);
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

    const startGeneration = async (mode: GenerationMode) => {
        if (!uploadedImage) return;

        setGenerationMode(mode);
        setIsLoading(true);
        setAppState('generating');
        
        const themes = mode === 'ethnicities' ? ETHNICITIES : CREATIVE_THEMES;
        const promptMap = PROMPT_MAPS[mode];

        const initialImages: Record<string, GeneratedImage> = {};
        themes.forEach(theme => {
            initialImages[theme] = { status: 'pending' };
        });
        setGeneratedImages(initialImages);

        const concurrencyLimit = 2;
        const themesQueue = [...themes];

        const processTheme = async (theme: string) => {
            try {
                const prompt = promptMap[theme as keyof typeof promptMap];
                const resultUrl = await generateTransformedImage(uploadedImage, prompt, theme, mode);
                setGeneratedImages(prev => ({
                    ...prev,
                    [theme]: { status: 'done', url: resultUrl },
                }));
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
                setGeneratedImages(prev => ({
                    ...prev,
                    [theme]: { status: 'error', error: errorMessage },
                }));
                console.error(`Failed to generate image for ${theme}:`, err);
            }
        };

        const workers = Array(concurrencyLimit).fill(null).map(async () => {
            while (themesQueue.length > 0) {
                const theme = themesQueue.shift();
                if (theme) {
                    await processTheme(theme);
                }
            }
        });

        await Promise.all(workers);

        setIsLoading(false);
        setAppState('results-shown');
    };

    const handleRegenerateItem = async (theme: string) => {
        if (!uploadedImage || !generationMode) return;

        if (generatedImages[theme]?.status === 'pending') {
            return;
        }
        
        console.log(`Regenerating image for ${theme}...`);

        setGeneratedImages(prev => ({
            ...prev,
            [theme]: { status: 'pending' },
        }));

        try {
            const promptMap = PROMPT_MAPS[generationMode];
            const prompt = promptMap[theme as keyof typeof promptMap];
            const resultUrl = await generateTransformedImage(uploadedImage, prompt, theme, generationMode);
            setGeneratedImages(prev => ({
                ...prev,
                [theme]: { status: 'done', url: resultUrl },
            }));
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            setGeneratedImages(prev => ({
                ...prev,
                [theme]: { status: 'error', error: errorMessage },
            }));
            console.error(`Failed to regenerate image for ${theme}:`, err);
        }
    };
    
    const handleReset = () => {
        setUploadedImage(null);
        setGeneratedImages({});
        setAppState('idle');
        setGenerationMode(null);
    };

    const handleDownloadIndividualImage = (theme: string) => {
        const image = generatedImages[theme];
        if (image?.status === 'done' && image.url) {
            const link = document.createElement('a');
            link.href = image.url;
            link.download = `raceify-${theme.toLowerCase().replace(/ /g, '-')}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const handleDownloadAlbum = async () => {
        if (!generationMode) return;
        setIsDownloading(true);
        try {
            const themes = generationMode === 'ethnicities' ? ETHNICITIES : CREATIVE_THEMES;
            const imageData = (Object.entries(generatedImages) as [string, GeneratedImage][])
                .filter(([, image]) => image.status === 'done' && image.url)
                .reduce((acc, [theme, image]) => {
                    acc[theme] = image.url!;
                    return acc;
                }, {} as Record<string, string>);

            if (Object.keys(imageData).length < themes.length) {
                alert("Please wait for all images to finish generating before downloading the album.");
                return;
            }
            
            const albumSubtitle = generationMode === 'ethnicities' 
                ? 'A Journey Through Different Heritages' 
                : 'A Journey Through Imagination';

            const albumDataUrl = await createAlbumPage(imageData, albumSubtitle, themes);

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
    
    const currentThemes = generationMode === 'ethnicities' ? ETHNICITIES : (generationMode === 'creative' ? CREATIVE_THEMES : []);

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
                                Click the polaroid to upload your photo and begin your journey.
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
                         <div className="flex flex-col sm:flex-row items-center gap-4 mt-4">
                            <button onClick={() => startGeneration('ethnicities')} className={primaryButtonClasses}>
                                Explore Heritages
                            </button>
                             <button onClick={() => startGeneration('creative')} className={primaryButtonClasses}>
                                Get Creative
                            </button>
                         </div>
                        <button onClick={handleReset} className={`${secondaryButtonClasses} mt-2`}>
                            Different Photo
                        </button>
                    </div>
                )}

                {(appState === 'generating' || appState === 'results-shown') && (
                     <>
                        {isMobile ? (
                            <div className="w-full max-w-sm flex-1 overflow-y-auto mt-4 space-y-8 p-4">
                                {currentThemes.map((theme) => (
                                    <div key={theme} className="flex justify-center">
                                         <PolaroidCard
                                            caption={theme}
                                            status={generatedImages[theme]?.status || 'pending'}
                                            imageUrl={generatedImages[theme]?.url}
                                            error={generatedImages[theme]?.error}
                                            onShake={handleRegenerateItem}
                                            onDownload={handleDownloadIndividualImage}
                                            isMobile={isMobile}
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div ref={dragAreaRef} className="relative w-full max-w-5xl h-[600px] mt-4">
                                {currentThemes.map((theme, index) => {
                                    const { top, left, rotate } = POSITIONS[index];
                                    return (
                                        <motion.div
                                            key={theme}
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
                                                caption={theme}
                                                status={generatedImages[theme]?.status || 'pending'}
                                                imageUrl={generatedImages[theme]?.url}
                                                error={generatedImages[theme]?.error}
                                                onShake={handleRegenerateItem}
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