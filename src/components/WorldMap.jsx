import React, { useMemo, useState } from 'react';
import { geoMercator, geoPath, geoGraticule } from 'd3-geo';
import { feature } from 'topojson-client';
import geoData from '../data/world-50m.json';

function WorldMap({ countries, selectedCountryId, interactionMode, onCountrySelect }) {
  // Use D3 natively to bypass all React 19 + react-simple-maps bugs
  const { features, pathGenerator, graticulePath, spherePath } = useMemo(() => {
    const mapFeatures = feature(geoData, geoData.objects.countries).features;
    
    // Create a precise mercator projection
    const projection = geoMercator()
      .scale(120)
      .translate([490, 380]); // Shift down and scale down to fit safely in viewBox
      
    const pathGen = geoPath().projection(projection);
    const graticule = geoGraticule();

    return {
      features: mapFeatures,
      pathGenerator: pathGen,
      projFunc: projection,
      graticulePath: pathGen(graticule()),
      spherePath: pathGen({ type: "Sphere" })
    };
  }, []);

  const chokepoints = [
    { name: "STRAIT OF HORMUZ", coords: [56.3, 26.5] },
    { name: "SUEZ CANAL", coords: [32.3, 30.6] },
    { name: "PANAMA CANAL", coords: [-79.9, 9.1] },
    { name: "STRAIT OF MALACCA", coords: [101.0, 3.0] },
    { name: "BAB EL-MANDEB STRAIT", coords: [43.3, 12.6] }
  ];

  const [hoveredCountry, setHoveredCountry] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const getCountryStyle = (geo) => {
    const geoName = geo.properties.name;
    const countryData = countries.find(c => 
      c.name === geoName || 
      c.id === geoName || 
      (c.aliases && c.aliases.includes(geoName))
    );

    const isSelected = countryData?.id === selectedCountryId;
    const isHovered = hoveredCountry === geoName;
    const isTargeting = interactionMode === 'SELECTING_TARGET';
    
    let baseColor = "#1e293b"; 
    let strokeColor = "#0f172a";
    let strokeWidth = 0.3;
    let filter = "drop-shadow(0px 4px 4px rgba(0,0,0,0.5))";
    let cursor = "default";
    let animation = "none";
    
    if (countryData) {
      strokeWidth = 0.8;
      if (countryData.isAnnihilated) {
        baseColor = "#000000"; // Pitch Black
        strokeColor = "#334155";
        filter = "none";
      } else if (countryData.threat_level > 70) {
        baseColor = "rgba(220, 38, 38, 0.75)"; 
        strokeColor = "#ef4444";
        filter = "url(#glow)";
      } else if (countryData.threat_level > 30) {
        baseColor = "rgba(217, 119, 6, 0.6)"; 
        strokeColor = "#fbbf24";
      } else if (countryData.threat_level > 0) {
        baseColor = "rgba(234, 179, 8, 0.5)";  // Pale Yellow to indicate minor tension
        strokeColor = "#eab308";
      } else {
        baseColor = "rgba(13, 148, 136, 0.5)"; 
        strokeColor = "#2dd4bf";
      }
      cursor = countryData.isAnnihilated ? "not-allowed" : "pointer";
    }

    if (isSelected) {
      if (isTargeting) {
        baseColor = "rgba(45, 212, 191, 0.9)"; 
        strokeColor = "#ffffff";
        animation = "blink 2s infinite";
        filter = "url(#glow)";
      } else {
        baseColor = "rgba(255, 255, 255, 0.8)";
        strokeColor = "#ffffff";
      }
      strokeWidth = 1.5;
    }

    // Hover overrides
    if (isHovered && countryData) {
      if (isTargeting && !isSelected) {
        baseColor = "rgba(239, 68, 68, 0.9)";
        cursor = "crosshair";
      } else {
        baseColor = "rgba(255, 255, 255, 0.9)";
      }
      strokeColor = "#fff";
      strokeWidth = 1.2;
      filter = "drop-shadow(0px 8px 8px rgba(0,0,0,0.8))";
    }

    return {
      fill: baseColor,
      stroke: strokeColor,
      strokeWidth,
      filter,
      cursor,
      animation,
      transition: "all 0.3s ease",
      outline: "none"
    };
  };

  return (
    <div 
      style={{ width: "100%", height: "100%", position: "relative", display: "flex", justifyContent: "center", alignItems: "center" }}
      onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
    >
      <svg 
        viewBox="0 0 980 600" 
        style={{ width: "100%", maxHeight: "100%", outline: "none" }}
      >
        <defs>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <radialGradient id="oceanGradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <stop offset="0%" stopColor="#0B132B" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#050A15" stopOpacity="0.8" />
          </radialGradient>
          <style>
            {`
              @keyframes pulseRing {
                0% { r: 2; opacity: 1; stroke-width: 1; }
                100% { r: 12; opacity: 0; stroke-width: 4; }
              }
              .chokepoint-ring {
                animation: pulseRing 2s infinite ease-out;
              }
            `}
          </style>
        </defs>

        {/* Ocean Background mapping to the projection bounds */}
        <path d={spherePath} fill="url(#oceanGradient)" stroke="#1e293b" strokeWidth={0.5} />
        
        {/* Graticule Grid Lines */}
        <path d={graticulePath} fill="none" stroke="rgba(45, 212, 191, 0.15)" strokeWidth={0.5} />
        
        {/* Render Countries */}
        <g strokeLinejoin="round" strokeLinecap="round">
          {features.map((geo, i) => {
            const geoName = geo.properties.name;
            const hasData = countries.some(c => c.name === geoName || c.id === geoName || (c.aliases && c.aliases.includes(geoName)));
            const styleProps = getCountryStyle(geo);
            
            return (
              <path
                key={geo.id || i}
                d={pathGenerator(geo)}
                fill={styleProps.fill}
                stroke={styleProps.stroke}
                strokeWidth={styleProps.strokeWidth}
                filter={styleProps.filter}
                style={{ 
                  cursor: styleProps.cursor, 
                  animation: styleProps.animation,
                  transition: styleProps.transition,
                  outline: "none"
                }}
                onMouseEnter={() => setHoveredCountry(geoName)}
                onMouseLeave={() => setHoveredCountry(null)}
                onClick={() => {
                  let selectedId = geoName;
                  if (hasData) {
                    const countryData = countries.find(c => c.name === geoName || c.id === geoName || (c.aliases && c.aliases.includes(geoName)));
                    selectedId = countryData.id;
                  }
                  onCountrySelect(selectedId);
                }}
              />
            );
          })}
        </g>

        {/* Chokepoint Markers */}
        <g>
          {chokepoints.map((cp, i) => {
             const coords = projection(cp.coords);
             if (!coords) return null;
             const [cx, cy] = coords;
             return (
               <g key={i} 
                  onMouseEnter={() => setHoveredCountry(cp.name)}
                  onMouseLeave={() => setHoveredCountry(null)}
                  style={{ cursor: 'crosshair', outline: 'none' }}
               >
                 {/* Inner static marker */}
                 <circle cx={cx} cy={cy} r={2} fill="#ef4444" />
                 {/* Outer pulsing ring */}
                 <circle className="chokepoint-ring" cx={cx} cy={cy} r={2} fill="none" stroke="#ef4444" />
                 {/* Inner crosshair lines for tactical feel */}
                 <path d={`M${cx-5},${cy} L${cx+5},${cy} M${cx},${cy-5} L${cx},${cy+5}`} stroke="#ef4444" strokeWidth="0.5" />
               </g>
             )
          })}
        </g>
      </svg>

      {hoveredCountry && (
        <div style={{
          position: 'fixed',
          top: mousePos.y + 15,
          left: mousePos.x + 15,
          pointerEvents: 'none',
          zIndex: 9999,
          background: 'rgba(16, 26, 45, 0.9)',
          backdropFilter: 'blur(4px)',
          border: '1px solid var(--accent-cyan)',
          padding: '8px 12px',
          borderRadius: '4px',
          color: '#fff',
          fontWeight: 'bold',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          textTransform: 'uppercase',
          fontSize: '0.85rem'
        }}>
          {hoveredCountry}
        </div>
      )}
    </div>
  );
}

export default WorldMap;
