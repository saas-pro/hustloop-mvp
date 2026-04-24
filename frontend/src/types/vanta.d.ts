declare module 'vanta/dist/vanta.dots.min' {
    interface VantaEffect {
        destroy(): void;
        setOptions(options: Partial<VantaOptions>): void;
        options?: VantaOptions;
    }

    interface VantaOptions {
        el: HTMLElement | null;
        THREE: any;
        mouseControls?: boolean;
        touchControls?: boolean;
        gyroControls?: boolean;
        minHeight?: number;
        minWidth?: number;
        scale?: number;
        scaleMobile?: number;
        size?: number;
        spacing?: number;
        showLines?: boolean;
        backgroundColor?: number;
        color?: number;
    }

    export default function DOTS(options: VantaOptions): VantaEffect;
}
