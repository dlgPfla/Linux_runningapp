export {};

declare global {
  type KakaoLatLngInstance = object;

  type KakaoMapInstance = object;

  interface KakaoOverlayInstance {
    setMap: (map: KakaoMapInstance | null) => void;
  }

  interface KakaoMapsNamespace {
    load: (callback: () => void) => void;
    LatLng: new (latitude: number, longitude: number) => KakaoLatLngInstance;
    Map: new (
      container: HTMLElement,
      options: { center: KakaoLatLngInstance; level: number }
    ) => KakaoMapInstance;
    CustomOverlay: new (options: {
      position: KakaoLatLngInstance;
      content: HTMLElement;
      yAnchor?: number;
    }) => KakaoOverlayInstance;
  }

  interface Window {
    kakao?: {
      maps: KakaoMapsNamespace;
    };
  }
}
