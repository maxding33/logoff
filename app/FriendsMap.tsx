"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

type FriendLocation = {
  user_id: string;
  lat: number;
  lng: number;
  updated_at: string;
  users: { username: string; avatar_url: string | null } | null;
};

type Props = {
  currentUserId: string;
};

export default function FriendsMap({ currentUserId }: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const watchIdRef = useRef<number | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [friendLocations, setFriendLocations] = useState<FriendLocation[]>([]);

  const fetchFriendLocations = () =>
    fetch(`/api/friend-locations?userId=${currentUserId}`)
      .then((r) => r.json())
      .then(({ locations }) => setFriendLocations(locations ?? []));

  // Fetch + realtime subscribe to friend locations
  useEffect(() => {
    if (!currentUserId) return;
    fetchFriendLocations();

    if (!supabase) return;
    const channel = supabase
      .channel("friend-locations")
      .on("postgres_changes", { event: "*", schema: "public", table: "user_locations" }, fetchFriendLocations)
      .subscribe();

    return () => { supabase!.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

  // Initialize map and request location
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    import("mapbox-gl").then((mapboxgl) => {
      mapboxgl.default.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!;

      const map = new mapboxgl.default.Map({
        container: mapContainerRef.current!,
        style: "mapbox://styles/mapbox/dark-v11",
        center: [0, 51],
        zoom: 13,
      });

      mapRef.current = map;

      if (!navigator.geolocation) return;

      const updateLocation = (lat: number, lng: number) => {
        fetch("/api/location", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: currentUserId, lat, lng }),
        });
      };

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude: lat, longitude: lng } = pos.coords;
          map.setCenter([lng, lat]);
          updateLocation(lat, lng);

          watchIdRef.current = navigator.geolocation.watchPosition(
            (p) => updateLocation(p.coords.latitude, p.coords.longitude),
            undefined,
            { maximumAge: 30000, timeout: 10000 }
          );
        },
        () => setLocationDenied(true)
      );
    });

    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      mapRef.current?.remove();
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Add/update friend markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    import("mapbox-gl").then((mapboxgl) => {
      friendLocations.forEach((loc) => {
        const existing = markersRef.current.get(loc.user_id);
        if (existing) {
          existing.setLngLat([loc.lng, loc.lat]);
          return;
        }

        const el = document.createElement("div");
        el.style.cssText = [
          "width:40px", "height:40px", "border-radius:50%",
          "border:2px solid #4a7c59", "background:#222",
          "overflow:hidden", "display:flex", "align-items:center",
          "justify-content:center", "font-size:14px",
          "font-weight:700", "color:#fff", "cursor:pointer",
        ].join(";");

        if (loc.users?.avatar_url) {
          const img = document.createElement("img");
          img.src = loc.users.avatar_url;
          img.style.cssText = "width:100%;height:100%;object-fit:cover";
          el.appendChild(img);
        } else {
          el.textContent = (loc.users?.username ?? "?")[0].toUpperCase();
        }

        const marker = new mapboxgl.default.Marker({ element: el })
          .setLngLat([loc.lng, loc.lat])
          .setPopup(new mapboxgl.default.Popup({ offset: 25 }).setText(`@${loc.users?.username ?? "unknown"}`))
          .addTo(map);

        markersRef.current.set(loc.user_id, marker);
      });

      // Remove stale markers
      markersRef.current.forEach((marker, userId) => {
        if (!friendLocations.find((l) => l.user_id === userId)) {
          marker.remove();
          markersRef.current.delete(userId);
        }
      });
    });
  }, [friendLocations]);

  return (
    <div style={{ position: "relative", height: "calc(100vh - 180px)" }}>
      <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />
      {locationDenied && (
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.85)", gap: "12px", padding: "32px",
        }}>
          <p style={{ color: "#fff", fontSize: "15px", fontWeight: 700, textAlign: "center", margin: 0 }}>
            location access denied
          </p>
          <p style={{ color: "#888", fontSize: "13px", textAlign: "center", margin: 0, maxWidth: "240px", lineHeight: 1.5 }}>
            enable location in Settings to see your friends on the map
          </p>
        </div>
      )}
    </div>
  );
}
