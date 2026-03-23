import { ChevronRight as ChevronRightIcon } from "lucide-react";
import { clsx } from "clsx";
import * as Color from "color-bits";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

const getRGBA = (cssColor, fallback = "rgba(180, 180, 180)") => {
    if (typeof window === "undefined") return fallback;
    if (!cssColor) return fallback;
    try {
        if (typeof cssColor === "string" && cssColor.startsWith("var(")) {
            const element = document.createElement("div");
            element.style.color = cssColor;
            document.body.appendChild(element);
            const computedColor = window.getComputedStyle(element).color;
            document.body.removeChild(element);
            return Color.formatRGBA(Color.parse(computedColor));
        }
        return Color.formatRGBA(Color.parse(cssColor));
    } catch (e) {
        console.error("Color parsing failed:", e);
        return fallback;
    }
};

const colorWithOpacity = (color, opacity) => {
    if (!color.startsWith("rgb")) return color;
    return Color.formatRGBA(Color.alpha(Color.parse(color), opacity));
};

const Icons = {
    logo: ({ className }) => (
        <svg
            width="42"
            height="24"
            viewBox="0 0 42 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={cn("size-4 fill-[var(--secondary)]", className)}
        >
            <g clipPath="url(#clip0_322_9172)">
                <path
                    d="M22.3546 0.96832C22.9097 0.390834 23.6636 0.0664062 24.4487 0.0664062C27.9806 0.0664062 31.3091 0.066408 34.587 0.0664146C41.1797 0.0664284 44.481 8.35854 39.8193 13.2082L29.6649 23.7718C29.1987 24.2568 28.4016 23.9133 28.4016 23.2274V13.9234L29.5751 12.7025C30.5075 11.7326 29.8472 10.0742 28.5286 10.0742H13.6016L22.3546 0.96832Z"
                    fill="currentColor"
                />
                <path
                    d="M19.6469 23.0305C19.0919 23.608 18.338 23.9324 17.5529 23.9324C14.021 23.9324 10.6925 23.9324 7.41462 23.9324C0.821896 23.9324 -2.47942 15.6403 2.18232 10.7906L12.3367 0.227022C12.8029 -0.257945 13.6 0.0855283 13.6 0.771372L13.6 10.0754L12.4265 11.2963C11.4941 12.2662 12.1544 13.9246 13.473 13.9246L28.4001 13.9246L19.6469 23.0305Z"
                    fill="currentColor"
                />
            </g>
            <defs>
                <clipPath id="clip0_322_9172">
                    <rect width="42" height="24" fill="white" />
                </clipPath>
            </defs>
        </svg>
    ),
    soc2: ({ className }) => (
        <svg width="46" height="45" viewBox="0 0 46 45" fill="none" className={cn("size-4", className)}>
            <rect x="3" y="0.863281" width="40" height="40" rx="20" fill="#27272A" />
            <g>
                <rect x="6.15784" y="4.021" width="33.6842" height="33.6842" rx="16.8421" fill="#52525C" />
                <path d="M15.0475 29.6233C13.7506 29.6233 12.9548 28.8938 12.8738 27.8033L13.8464 27.7443C13.9348 28.4222 14.3401 28.798 15.0622 28.798C15.6812 28.798 16.0348 28.5696 16.0348 28.1201C16.0348 27.7148 15.8285 27.4717 14.7601 27.2212C13.4633 26.9264 12.977 26.558 12.977 25.7033C12.977 24.7896 13.6917 24.1559 14.8633 24.1559C16.1159 24.1559 16.8012 24.8854 16.9191 25.8948L15.9538 25.9391C15.8875 25.3717 15.5117 24.9812 14.8485 24.9812C14.2959 24.9812 13.957 25.2612 13.957 25.6664C13.957 26.0938 14.2001 26.2559 15.1359 26.4696C16.5433 26.7717 17.0148 27.2875 17.0148 28.0685C17.0148 29.0264 16.2338 29.6233 15.0475 29.6233ZM19.9915 29.6233C18.4367 29.6233 17.5009 28.5843 17.5009 26.897C17.5009 25.2096 18.4367 24.1559 19.9915 24.1559C21.5536 24.1559 22.4894 25.2096 22.4894 26.897C22.4894 28.5843 21.5536 29.6233 19.9915 29.6233ZM19.9915 28.7906C20.942 28.7906 21.502 28.0906 21.502 26.897C21.502 25.7033 20.942 24.9885 19.9915 24.9885C19.0557 24.9885 18.4883 25.7033 18.4883 26.897C18.4883 28.0906 19.0557 28.7906 19.9915 28.7906ZM25.324 29.6233C23.8945 29.6233 22.8997 28.6064 22.8997 26.897C22.8997 25.2169 23.865 24.1559 25.3313 24.1559C26.665 24.1559 27.3797 24.8559 27.6082 26.0422L26.6061 26.0938C26.4734 25.4085 26.0534 24.9885 25.3313 24.9885C24.4397 24.9885 23.8871 25.7327 23.8871 26.897C23.8871 28.0759 24.4545 28.7906 25.324 28.7906C26.105 28.7906 26.5176 28.3412 26.6355 27.5896L27.6376 27.6412C27.4313 28.8717 26.6429 29.6233 25.324 29.6233ZM29.6489 29.5054C29.6489 28.238 30.1205 27.5085 31.5573 26.7569C32.2721 26.3812 32.53 26.1748 32.53 25.7327C32.53 25.298 32.2426 24.9885 31.6826 24.9885C31.0858 24.9885 30.7321 25.3348 30.6510 25.9685L29.6637 25.9096C29.7668 24.8191 30.4889 24.1559 31.6826 24.1559C32.8395 24.1559 33.5173 24.7896 33.5173 25.718C33.5173 26.5212 33.1416 26.897 32.1173 27.4422C31.2479 27.9064 30.8279 28.3485 30.7984 28.6727H33.5173V29.5054H29.6489Z" fill="#101828" />
                <path d="M13.0537 17.8882L14.9621 12.6566H15.6253L17.5263 17.8882H16.9811L16.4211 16.3187H14.159L13.599 17.8882H13.0537ZM14.3285 15.8324H16.2516L15.2937 13.1061L14.3285 15.8324ZM18.026 17.8882V12.6566H18.5271V17.8882H18.026ZM21.5495 18.0061C20.1642 18.0061 19.2506 16.9745 19.2506 15.2798C19.2506 13.585 20.1642 12.5387 21.5495 12.5387C22.7727 12.5387 23.4506 13.2387 23.6642 14.3292L23.1337 14.3661C22.9863 13.5482 22.4632 13.0324 21.5495 13.0324C20.4811 13.0324 19.7737 13.8798 19.7737 15.2798C19.7737 16.6798 20.4811 17.5124 21.5495 17.5124C22.5074 17.5124 23.0453 16.9598 23.1779 16.0608L23.7085 16.0977C23.5242 17.2471 22.7727 18.0061 21.5495 18.0061ZM24.5062 17.8882V12.6566H26.3409C27.4904 12.6566 28.1683 13.2461 28.1683 14.2187C28.1683 15.1913 27.4904 15.7808 26.3409 15.7808H25.0072V17.8882H24.5062ZM25.0072 15.2945H26.3409C27.1957 15.2945 27.6378 14.9187 27.6378 14.2187C27.6378 13.5113 27.1957 13.1429 26.3409 13.1429H25.0072V15.2945ZM27.9425 17.8882L29.851 12.6566H30.5141L32.4152 17.8882H31.8699L31.3099 16.3187H29.0478L28.4878 17.8882H27.9425ZM29.2173 15.8324H31.1404L30.1825 13.1061L29.2173 15.8324Z" fill="#6A7282" />
                <line x1="10.4938" y1="21.2488" x2="34.988" y2="21.2488" stroke="#E5E7EB" strokeWidth="0.263158" />
            </g>
        </svg>
    ),
    hipaa: ({ className }) => (
        <svg width="46" height="45" viewBox="0 0 46 45" fill="none" className={className}>
            <rect x="3" y="0.863281" width="40" height="40" rx="20" fill="#27272A" />
            <path fillRule="evenodd" clipRule="evenodd" d="M23 11C28.5228 11 33 15.4772 33 21C33 26.5228 28.5228 31 23 31C17.4772 31 13 26.5228 13 21C13 15.4772 17.4772 11 23 11ZM23 13C27.4183 13 31 16.5817 31 21C31 25.4183 27.4183 29 23 29C18.5817 29 15 25.4183 15 21C15 16.5817 18.5817 13 23 13Z" fill="#E4E4E7" />
        </svg>
    ),
    gdpr: ({ className }) => (
        <svg width="46" height="45" viewBox="0 0 46 45" fill="none" className={className}>
            <rect x="3" y="0.863281" width="40" height="40" rx="20" fill="#27272A" />
            <path d="M15 15H31V31H15V15Z" fill="#E4E4E7" />
        </svg>
    ),
};

const FlickeringGrid = ({
    squareSize = 3,
    gridGap = 3,
    flickerChance = 0.2,
    color = "#B4B4B4",
    width,
    height,
    className,
    maxOpacity = 0.15,
    text = "",
    fontSize = 140,
    fontWeight = 600,
    ...props
}) => {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [isInView, setIsInView] = useState(false);
    const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

    const memoizedColor = useMemo(() => {
        return getRGBA(color);
    }, [color]);

    const drawGrid = useCallback(
        (ctx, width, height, cols, rows, squares, dpr) => {
            ctx.clearRect(0, 0, width, height);
            const maskCanvas = document.createElement("canvas");
            maskCanvas.width = width;
            maskCanvas.height = height;
            const maskCtx = maskCanvas.getContext("2d", { willReadFrequently: true });
            if (!maskCtx) return;

            if (text) {
                maskCtx.save();
                maskCtx.scale(dpr, dpr);
                maskCtx.fillStyle = "white";
                maskCtx.font = `${fontWeight} ${fontSize}px "Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
                maskCtx.textAlign = "center";
                maskCtx.textBaseline = "middle";
                maskCtx.fillText(text, width / (2 * dpr), height / (2 * dpr));
                maskCtx.restore();
            }

            for (let i = 0; i < cols; i++) {
                for (let j = 0; j < rows; j++) {
                    const x = i * (squareSize + gridGap) * dpr;
                    const y = j * (squareSize + gridGap) * dpr;
                    const squareWidth = squareSize * dpr;
                    const squareHeight = squareSize * dpr;

                    const maskData = maskCtx.getImageData(x, y, squareWidth, squareHeight).data;
                    const hasText = maskData.some((value, index) => index % 4 === 0 && value > 0);

                    const opacity = squares[i * rows + j];
                    const finalOpacity = hasText ? Math.min(1, opacity * 3 + 0.4) : opacity;

                    ctx.fillStyle = colorWithOpacity(memoizedColor, finalOpacity);
                    ctx.fillRect(x, y, squareWidth, squareHeight);
                }
            }
        },
        [memoizedColor, squareSize, gridGap, text, fontSize, fontWeight],
    );

    const setupCanvas = useCallback(
        (canvas, width, height) => {
            const dpr = window.devicePixelRatio || 1;
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            const cols = Math.ceil(width / (squareSize + gridGap));
            const rows = Math.ceil(height / (squareSize + gridGap));

            const squares = new Float32Array(cols * rows);
            for (let i = 0; i < squares.length; i++) {
                squares[i] = Math.random() * maxOpacity;
            }

            return { cols, rows, squares, dpr };
        },
        [squareSize, gridGap, maxOpacity],
    );

    const updateSquares = useCallback(
        (squares, deltaTime) => {
            for (let i = 0; i < squares.length; i++) {
                if (Math.random() < flickerChance * deltaTime) {
                    squares[i] = Math.random() * maxOpacity;
                }
            }
        },
        [flickerChance, maxOpacity],
    );

    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let animationFrameId;
        let gridParams;

        const updateCanvasSize = () => {
            const newWidth = width || container.clientWidth;
            const newHeight = height || container.clientHeight;
            setCanvasSize({ width: newWidth, height: newHeight });
            gridParams = setupCanvas(canvas, newWidth, newHeight);
        };

        updateCanvasSize();

        let lastTime = 0;
        const animate = (time) => {
            if (!isInView) return;
            const deltaTime = (time - lastTime) / 1000;
            lastTime = time;
            updateSquares(gridParams.squares, deltaTime);
            drawGrid(ctx, canvas.width, canvas.height, gridParams.cols, gridParams.rows, gridParams.squares, gridParams.dpr);
            animationFrameId = requestAnimationFrame(animate);
        };

        const resizeObserver = new ResizeObserver(() => {
            updateCanvasSize();
        });

        resizeObserver.observe(container);

        const intersectionObserver = new IntersectionObserver(
            ([entry]) => {
                setIsInView(entry.isIntersecting);
            },
            { threshold: 0 },
        );

        intersectionObserver.observe(canvas);

        if (isInView) {
            animationFrameId = requestAnimationFrame(animate);
        }

        return () => {
            cancelAnimationFrame(animationFrameId);
            resizeObserver.disconnect();
            intersectionObserver.disconnect();
        };
    }, [setupCanvas, updateSquares, drawGrid, width, height, isInView]);

    return (
        <div ref={containerRef} className={cn(`h-full w-full ${className}`)} {...props}>
            <canvas ref={canvasRef} className="pointer-events-none" style={{ width: canvasSize.width, height: canvasSize.height }} />
        </div>
    );
};

function useMediaQuery(query) {
    const [value, setValue] = useState(false);
    useEffect(() => {
        function checkQuery() {
            const result = window.matchMedia(query);
            setValue(result.matches);
        }
        checkQuery();
        window.addEventListener("resize", checkQuery);
        const mediaQuery = window.matchMedia(query);
        mediaQuery.addEventListener("change", checkQuery);
        return () => {
            window.removeEventListener("resize", checkQuery);
            mediaQuery.removeEventListener("change", checkQuery);
        };
    }, [query]);
    return value;
}

const siteConfig = {
    hero: {
        description: "AI assistant designed to streamline your digital workflows and handle mundane tasks, so you can focus on what truly matters",
    },
    footerLinks: [
        {
            title: "Company",
            links: [
                { id: 1, title: "About", url: "#" },
                { id: 2, title: "Contact", url: "#" },
                { id: 3, title: "Blog", url: "#" },
                { id: 4, title: "Story", url: "#" },
            ],
        },
        {
            title: "Products",
            links: [
                { id: 5, title: "Company", url: "#" },
                { id: 6, title: "Product", url: "#" },
                { id: 7, title: "Press", url: "#" },
                { id: 8, title: "More", url: "#" },
            ],
        },
        {
            title: "Resources",
            links: [
                { id: 9, title: "Press", url: "#" },
                { id: 10, title: "Careers", url: "#" },
                { id: 11, title: "Newsletters", url: "#" },
                { id: 12, title: "More", url: "#" },
            ],
        },
    ],
};

const Component = () => {
    const tablet = useMediaQuery("(max-width: 1024px)");
    const mobile = useMediaQuery("(max-width: 640px)");

    return (
        <footer id="footer" className="w-full pb-0 bg-black text-white overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between p-10 relative z-10">
                <div className="flex flex-col items-start justify-start gap-y-5 max-w-xs mx-0">
                    <a href="/" className="flex items-center gap-2">
                        <p className="text-xl font-semibold text-white">Volturiano</p>
                    </a>
                    <p className="tracking-tight text-zinc-400 font-medium">
                        {siteConfig.hero.description}
                    </p>
                </div>
                <div className="pt-5 md:w-1/2">
                    <div className="flex flex-col items-start justify-start md:flex-row md:items-center md:justify-between gap-y-5 lg:pl-10">
                        {siteConfig.footerLinks.map((column, columnIndex) => (
                            <ul key={columnIndex} className="flex flex-col gap-y-2">
                                <li className="mb-2 text-sm font-semibold text-white">
                                    {column.title}
                                </li>
                                {column.links.map((link) => (
                                    <li
                                        key={link.id}
                                        className="group inline-flex cursor-pointer items-center justify-start gap-1 text-[15px]/snug text-zinc-400 hover:text-white transition-colors"
                                    >
                                        <a href={link.url}>{link.title}</a>
                                        <div className="flex size-4 items-center justify-center border border-zinc-700 rounded translate-x-0 transform opacity-0 transition-all duration-300 ease-out group-hover:translate-x-1 group-hover:opacity-100">
                                            <ChevronRightIcon className="h-4 w-4" />
                                        </div>
                                    </li>
                                ))}\
                            </ul>
                        ))}
                    </div>
                </div>
            </div>
            <div className="w-full h-48 md:h-64 relative mt-0 z-0">
                <div className="absolute inset-0 bg-gradient-to-t from-transparent to-black z-10 from-40%" />
                <div className="absolute inset-0">
                    <FlickeringGrid
                        text="Volturiano"
                        fontSize={mobile ? 45 : tablet ? 80 : 120}
                        className="h-full w-full"
                        squareSize={2}
                        gridGap={tablet ? 2 : 3}
                        color="#6B7280"
                        maxOpacity={0.3}
                        flickerChance={0.1}
                    />
                </div>
            </div>
        </footer>
    );
};

export default function FooterFlickering() {
    return <Component />;
}
