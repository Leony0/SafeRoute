import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import '../styles/GoogleMap.css';
import Word from "./Word"

const GoogleMap = () => {
  const mapRef = useRef(null);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mapInitialized, setMapInitialized] = useState(false);
  const googleMapScriptRef = useRef(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [destination, setDestination] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [directionsRenderer, setDirectionsRenderer] = useState(null);
  const [map, setMap] = useState(null);
  const [safeWaypoints, setSafeWaypoints] = useState([]);
  const markersRef = useRef([]);  // マーカーを格納する配列

  // APIからデータを取得する
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const response = await axios.get('http://localhost:8000/crime/all');
        setLocations(response.data.locations);

        // APIキーを取得したらGoogle Maps APIを読み込む
        if (response.data.apiKey && !window.google && !googleMapScriptRef.current) {
          loadGoogleMapsAPI(response.data.apiKey);
        } else if (window.google) {
          // Google Maps APIがすでにロードされている場合
          setMapInitialized(true);
        }
      } catch (error) {
        console.error('Error fetching location data:', error);
        setError('位置情報データの取得に失敗しました。');
      } finally {
        setLoading(false);
      }
    };
    
    fetchLocations();
    
    // クリーンアップ関数
    return () => {
      // コンポーネントのアンマウント時にスクリプトを削除
      if (googleMapScriptRef.current) {
        document.head.removeChild(googleMapScriptRef.current);
        googleMapScriptRef.current = null;
      }
    };
  }, []);

  // Google Maps APIをロードする関数
  const loadGoogleMapsAPI = (apiKey) => {
    // すでにスクリプトが存在する場合は読み込まない
    if (document.querySelector(`script[src^="https://maps.googleapis.com/maps/api/js"]`)) {
      return;
    }
    
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry&callback=initMap`;
    script.async = true;
    script.defer = true;
    googleMapScriptRef.current = script;
    
    // グローバル関数としてinitMap関数を定義
    window.initMap = () => {
      setMapInitialized(true);
    };
    
    document.head.appendChild(script);
  };

  // 現在地を取得する関数
  const getCurrentLocation = () => {
    setIsLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const currentPos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setCurrentLocation(currentPos);
          document.getElementById('start').value = '現在地';
          // 現在地を地図上に表示
          if (map) {
            map.setCenter(currentPos);
            new window.google.maps.Marker({
              position: currentPos,
              map: map,
              icon: {
                url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'
              },
              title: '現在地'
            });
          }
          setIsLocating(false);
        },
        (error) => {
          console.error('Error getting current location:', error);
          let errorMessage = '現在地の取得に失敗しました。';
          switch(error.code) {
            case error.PERMISSION_DENIED:
              errorMessage += '位置情報へのアクセスが拒否されました。ブラウザの設定から位置情報の利用を許可してください。';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage += '位置情報が取得できませんでした。';
              break;
            case error.TIMEOUT:
              errorMessage += 'タイムアウトしました。再度お試しください。';
              break;
            default:
              errorMessage += '不明なエラーが発生しました。';
          }
          alert(errorMessage);
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      alert('お使いのブラウザは位置情報をサポートしていません。');
      setIsLocating(false);
    }
  };

  // 安全なウェイポイントを生成する関数 - 直線に対して垂直方向のウェイポイント
  const generateSafeWaypoints = (startLatLng, destinationLatLng, hazardLocations, google) => {
    console.log("Generating safe waypoints...");
    
    // 始点と終点がない場合は空の配列を返す
    if (!startLatLng || !destinationLatLng) {
      return [];
    }
    
    // 始点から終点への方向（角度）
    const heading = google.maps.geometry.spherical.computeHeading(
      startLatLng, 
      destinationLatLng
    );
    
    // 始点と終点の間の直線上または近くにある危険地点を見つける
    const potentialHazards = [];
    
    hazardLocations.forEach(hazard => {
      const hazardLatLng = new google.maps.LatLng(hazard.position.lat, hazard.position.lng);
      
      // 点と線の最短距離を計算（ヘベルサイン公式を使用）
      const distToLine = distancePointToLine(
        startLatLng, 
        destinationLatLng, 
        hazardLatLng,
        google
      );
      
      // 経路から500m以内の危険地点だけを考慮
      if (distToLine < 500) {
        potentialHazards.push({
          hazard: hazard,
          distance: distToLine,
          latLng: hazardLatLng
        });
      }
    });
    
    console.log("Potential hazards near route:", potentialHazards);
    
    // 危険地点がない場合は空の配列を返す
    if (potentialHazards.length === 0) {
      return [];
    }
    
    // 距離が近い順に並べ替え
    potentialHazards.sort((a, b) => a.distance - b.distance);
    
    // 最も経路に近い危険地点を回避するウェイポイントを作成
    const closestHazard = potentialHazards[0];
    const hazardLatLng = closestHazard.latLng;
    
    // 始点から終点への直線に垂直な方向（右90度と左90度）
    const rightAngle = heading + 90;
    const leftAngle = heading - 90;
    
    // 危険地点から垂直方向に離れた2つのポイントを生成（右と左）
    const rightOffset = google.maps.geometry.spherical.computeOffset(
      hazardLatLng,
      700, // 700メートル離れた位置
      rightAngle
    );
    
    const leftOffset = google.maps.geometry.spherical.computeOffset(
      hazardLatLng,
      700, // 700メートル離れた位置
      leftAngle
    );
    
    // 右と左どちらのウェイポイントが経路を短くするか計算
    const directDistance = google.maps.geometry.spherical.computeDistanceBetween(
      startLatLng, 
      destinationLatLng
    );
    
    const rightDetourDistance = 
      google.maps.geometry.spherical.computeDistanceBetween(startLatLng, rightOffset) +
      google.maps.geometry.spherical.computeDistanceBetween(rightOffset, destinationLatLng);
    
    const leftDetourDistance = 
      google.maps.geometry.spherical.computeDistanceBetween(startLatLng, leftOffset) +
      google.maps.geometry.spherical.computeDistanceBetween(leftOffset, destinationLatLng);
    
    // 迂回距離が短い方を選択
    const betterWaypoint = (rightDetourDistance <= leftDetourDistance) ? rightOffset : leftOffset;
    const waypointObj = {
      lat: betterWaypoint.lat(),
      lng: betterWaypoint.lng()
    };
    
    // デバッグ用に地図上に表示
    if (map) {
      new google.maps.Marker({
        position: {lat: waypointObj.lat, lng: waypointObj.lng},
        map: map,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 5,
          fillColor: "#00FF00",
          fillOpacity: 0.8,
          strokeWeight: 2,
          strokeColor: "#008800"
        },
        visible: false // デバッグ時にtrueにする
      });
    }
    
    console.log("Generated waypoint:", waypointObj);
    return [waypointObj];
  };

  // 点と線分の最短距離を計算する関数
  function distancePointToLine(lineStart, lineEnd, point, google) {
    // 線分の長さ
    const lineLength = google.maps.geometry.spherical.computeDistanceBetween(
      lineStart, 
      lineEnd
    );
    
    // 始点からのベクトル角度
    const bearing1 = google.maps.geometry.spherical.computeHeading(
      lineStart, 
      lineEnd
    );
    
    const bearing2 = google.maps.geometry.spherical.computeHeading(
      lineStart, 
      point
    );
    
    // 始点から点までの距離
    const distToPoint = google.maps.geometry.spherical.computeDistanceBetween(
      lineStart, 
      point
    );
    
    // 角度の差（ラジアン）
    const angleRad = (bearing1 - bearing2) * Math.PI / 180;
    
    // 線分上の最近傍点までの距離
    const projDist = distToPoint * Math.cos(angleRad);
    
    // 線分からの距離（サイン成分）
    const distance = Math.abs(distToPoint * Math.sin(angleRad));
    
    // 線分の長さ内にあるか確認
    if (projDist < 0) {
      // 始点の外側
      return google.maps.geometry.spherical.computeDistanceBetween(lineStart, point);
    } else if (projDist > lineLength) {
      // 終点の外側
      return google.maps.geometry.spherical.computeDistanceBetween(lineEnd, point);
    } else {
      // 線分上の投影点からの距離
      return distance;
    }
  }

  // マップが初期化されたらマーカーを追加
  useEffect(() => {
    if (!mapInitialized || !locations.length || !mapRef.current) return;
    
    const google = window.google;
    const mapInstance = new google.maps.Map(mapRef.current, {
      center: { lat: 35.4096218, lng: 136.754722 }, // 岐阜県付近
      zoom: 10,
    });
    
    setMap(mapInstance);
    
    // 経路案内サービスの初期化
    const directionsService = new google.maps.DirectionsService();
    const rendererInstance = new google.maps.DirectionsRenderer({
      draggable: true,
      map: mapInstance,
      panel: document.getElementById('directions-panel'),
      suppressMarkers: false // 標準のマーカーを表示
    });
    
    setDirectionsRenderer(rendererInstance);
    
    // 危険地点のマーカーと情報ウィンドウを追加
    const infoWindows = [];
    const hazardMarkers = [];
    
    // 以前のマーカーを削除
    markersRef.current.forEach(marker => marker.setMap(null));

    const newMarkers = [];
    locations.forEach((location) => {
      const marker = new google.maps.Marker({
        position: location.position,
        map: mapInstance,
        title: location.title,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: '#FF0000',
          fillOpacity: 0.6,
          strokeColor: '#FF0000',
          strokeOpacity: 0.9,
          strokeWeight: 1,
          scale: 8
        },
        zIndex: 100 // 他のマーカーより前面に表示
      });
      
      hazardMarkers.push(marker);
      
      const infoWindow = new google.maps.InfoWindow({
        content: `<div><h3>${location.title}</h3><p>${location.info}</p><p style="color: red; font-weight: bold;">⚠️ 危険地点</p></div>`
      });
      
      infoWindows.push(infoWindow);
      
      marker.addListener('click', () => {
        // 他の情報ウィンドウを閉じる
        infoWindows.forEach(window => window.close());
        infoWindow.open(mapInstance, marker);
      });
      
      // 危険エリアを表示（半径300m）
      const hazardCircle = new google.maps.Circle({
        strokeColor: "#FF0000",
        strokeOpacity: 0.8,
        strokeWeight: 1,
        fillColor: "#FF0000",
        fillOpacity: 0.2,
        map: mapInstance,
        center: location.position,
        radius: 300, // 300メートル
        zIndex: 50 // マーカーより背面に表示
      });

      newMarkers.push(marker);
    });
    
    // 目的地の自動補完
    const destinationInput = document.getElementById('destination');
    if (destinationInput) {
      const autocomplete = new google.maps.places.Autocomplete(destinationInput);
      autocomplete.setFields(['place_id', 'geometry', 'name']);
      
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (!place.geometry) {
          alert("選択された場所の詳細が取得できませんでした。");
          return;
        }
        
        setDestination(place.name);
        
        // 目的地をマップの中心にする
        if (mapInstance) {
          mapInstance.setCenter(place.geometry.location);
          mapInstance.setZoom(13);
        }
      });
    }
    
    // 出発地の自動補完
    const startInput = document.getElementById('start');
    if (startInput) {
      const autocompleteStart = new google.maps.places.Autocomplete(startInput);
      autocompleteStart.setFields(['place_id', 'geometry', 'name']);
      
      autocompleteStart.addListener('place_changed', () => {
        const place = autocompleteStart.getPlace();
        if (!place.geometry) {
          return;
        }
        
        // 出発地をマップの中心にする
        if (mapInstance) {
          mapInstance.setCenter(place.geometry.location);
          mapInstance.setZoom(13);
        }
      });
    }
    
    // 経路検索ボタンのイベントリスナー
    const routeButton = document.getElementById('route-button');
    if (routeButton) {
      routeButton.addEventListener('click', () => {
        calculateRoute(directionsService, rendererInstance, mapInstance, locations);
      });
    }
    
    // 現在地ボタンのイベントリスナー
    const currentLocationButton = document.getElementById('current-location-button');
    if (currentLocationButton) {
      currentLocationButton.addEventListener('click', getCurrentLocation);
    }
    // マーカーを保存
    markersRef.current = newMarkers;
    
  }, [mapInitialized, locations]);

  // 経路探索関数
  const calculateRoute = async (directionsService, directionsRenderer, mapInstance, hazardLocations) => {
    const startInput = document.getElementById('start');
    const destinationInput = document.getElementById('destination');
    const modeSelect = document.getElementById('mode');
    const avoidHazardsCheckbox = document.getElementById('avoid-hazards');
    
    if (!startInput || !destinationInput || !modeSelect || !avoidHazardsCheckbox) {
      console.error("Route elements not found");
      return;
    }
    
    const start = startInput.value;
    const end = destinationInput.value;
    const mode = modeSelect.value;
    const avoidHazards = avoidHazardsCheckbox.checked;
    
    if (!start || !end) {
      alert('出発地と目的地を入力してください');
      return;
    }
    
    // 経路検索中の表示
    startInput.disabled = true;
    destinationInput.disabled = true;
    modeSelect.disabled = true;
    avoidHazardsCheckbox.disabled = true;
    document.getElementById('route-button').disabled = true;
    document.getElementById('route-button').textContent = '経路検索中...';
    
    try {
      // 経路パネルを表示
      const directionsPanel = document.getElementById('directions-panel');
      if (directionsPanel) {
        directionsPanel.style.display = 'block';
      }
      
      const google = window.google;
      const geocoder = new google.maps.Geocoder();
      
      // 住所から座標を取得するPromise関数
      const getCoordinates = (address) => {
        return new Promise((resolve, reject) => {
          // 「現在地」の場合は現在地の座標を使用
          if (address === '現在地' && currentLocation) {
            resolve(new google.maps.LatLng(currentLocation.lat, currentLocation.lng));
            return;
          }
          
          // ジオコーディングで住所から座標を取得
          geocoder.geocode({ address: address }, (results, status) => {
            if (status === 'OK' && results && results.length > 0) {
              resolve(results[0].geometry.location);
            } else {
              reject(new Error(`住所「${address}」のジオコーディングに失敗しました: ${status}`));
            }
          });
        });
      };
      
      // 非同期で両方の座標を取得
      let startLatLng, endLatLng;
      try {
        [startLatLng, endLatLng] = await Promise.all([
          getCoordinates(start),
          getCoordinates(end)
        ]);
        
        console.log("Start coordinates:", startLatLng.toJSON());
        console.log("End coordinates:", endLatLng.toJSON());
      } catch (error) {
        console.error("ジオコーディングエラー:", error);
        alert(`住所の変換に失敗しました: ${error.message}`);
        
        // 入力欄を再度有効化して終了
        startInput.disabled = false;
        destinationInput.disabled = false;
        modeSelect.disabled = false;
        avoidHazardsCheckbox.disabled = false;
        document.getElementById('route-button').disabled = false;
        document.getElementById('route-button').textContent = 'ルート検索';
        return;
      }
      
      // 経路のリクエストオプション
      const routeRequest = {
        origin: start,
        destination: end,
        travelMode: google.maps.TravelMode[mode],
        provideRouteAlternatives: true // 代替ルートを提供
      };
      
      // 危険地点を避けるオプションを設定
      if (avoidHazards) {
        // 両方の座標が利用可能な場合、安全なウェイポイントを生成
        const waypoints = generateSafeWaypoints(startLatLng, endLatLng, hazardLocations, google);
        setSafeWaypoints(waypoints);
        
        // ウェイポイントがある場合は追加
        if (waypoints.length > 0) {
          // ウェイポイントをGoogleマップ形式に変換
          routeRequest.waypoints = waypoints.map(point => ({
            location: new google.maps.LatLng(point.lat, point.lng),
            stopover: false // 経由地点として表示しない
          }));
          
          // ウェイポイントがある場合は最適化オプションを無効に
          routeRequest.optimizeWaypoints = false;
        }
      }
      
      console.log("Route request:", routeRequest);
      
      // 経路検索実行
      directionsService.route(routeRequest, (response, status) => {
        // 入力欄を再度有効化
        startInput.disabled = false;
        destinationInput.disabled = false;
        modeSelect.disabled = false;
        avoidHazardsCheckbox.disabled = false;
        document.getElementById('route-button').disabled = false;
        document.getElementById('route-button').textContent = 'ルート検索';
        
        if (status === "OK") {
          directionsRenderer.setDirections(response);
          
          // 経路の所要時間と距離だけをシンプルに表示
          if (directionsPanel) {
            // 既存のパネル内容をクリア
            directionsPanel.innerHTML = '';
            
            // 経路の所要時間と距離だけを表示
            const route = response.routes[0];
            let totalDuration = 0;
            let totalDistance = 0;
            
            route.legs.forEach(leg => {
              totalDuration += leg.duration.value;
              totalDistance += leg.distance.value;
            });
            
            // 時間と距離を分かりやすく表示
            const hours = Math.floor(totalDuration / 3600);
            const minutes = Math.floor((totalDuration % 3600) / 60);
            const formattedDuration = hours > 0 ? 
              `${hours}時間${minutes}分` : 
              `${minutes}分`;
            
            const formattedDistance = (totalDistance / 1000).toFixed(1);
            
            const summaryDiv = document.createElement('div');
            summaryDiv.className = 'route-summary';
            summaryDiv.innerHTML = `
              <h3>経路情報</h3>
              <div class="summary-item">
                <strong>所要時間:</strong> ${formattedDuration}
              </div>
              <div class="summary-item">
                <strong>距離:</strong> ${formattedDistance} km
              </div>
              <div class="summary-note">
                ${avoidHazards ? '※危険地点を避けた経路です' : ''}
              </div>
            `;
            
            directionsPanel.appendChild(summaryDiv);
            directionsPanel.style.display = 'block';
          }
        } else {
          if (status === "ZERO_RESULTS") {
            window.alert("指定された条件では経路が見つかりませんでした。条件を変更してお試しください。");
          } else if (status === "NOT_FOUND") {
            window.alert("出発地または目的地が見つかりませんでした。より具体的な住所を入力してください。");
          } else {
            window.alert(`経路の取得に失敗しました: ${status}`);
          }
          console.error("Directions request failed:", status);
        }
      });
    } catch (error) {
      console.error("Error in route calculation:", error);
      // 入力欄を再度有効化
      startInput.disabled = false;
      destinationInput.disabled = false;
      modeSelect.disabled = false;
      avoidHazardsCheckbox.disabled = false;
      document.getElementById('route-button').disabled = false;
      document.getElementById('route-button').textContent = 'ルート検索';
      alert("経路計算中にエラーが発生しました。もう一度お試しください。");
    }
  };

  if (loading) {
    return <div className="loading">地図データを読み込み中...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="map-container">
      <div ref={mapRef} id="map" style={{ height: '100vh', width: '100%' }}></div>
      
      <div className="controls">
        <h2 className="controls-title">安全な経路検索</h2>
        <div>
          <b>出発地:</b>
          <div className="input-group">
            <input id="start" type="text" placeholder="出発地を入力または現在地を使用" />
            <button 
              id="current-location-button" 
              className="location-button"
              disabled={isLocating}
            >
              {isLocating ? '取得中...' : '📍現在地'}
            </button>
          </div>
        </div>
        <div className="control-group">
          <b>目的地:</b>
          <input 
            id="destination" 
            type="text" 
            placeholder="目的地を入力" 
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
          />
        </div>
        <div className="control-group">
          <b>移動手段:</b>
          <select id="mode">
            <option value="WALKING">徒歩</option>
            <option value="BICYCLING">自転車</option>
            <option value="DRIVING">車</option>
            <option value="TRANSIT">公共交通機関</option>
          </select>
        </div>
        <div className="control-group checkbox-group">
          <input type="checkbox" id="avoid-hazards" defaultChecked={true} />
          <label htmlFor="avoid-hazards">危険地点を避ける</label>
        </div>
        <button id="route-button" className="route-button">ルート検索</button>
        
        <div className="hazard-info">
          <p><span className="hazard-marker">⚠️</span> 赤いマーカーは危険地点を示します</p>
          <p>「危険地点を避ける」を選択すると、できるだけ危険地点から離れた経路を探索します</p>
        </div>
      </div>
      
      <div id="directions-panel"></div>
      
      <div className="legend">
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#FF0000', opacity: 0.6 }}></div>
          <span>危険地点</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#FF0000', opacity: 0.2, borderRadius: '2px' }}></div>
          <span>危険エリア（半径300m）</span>
        </div>
      </div>
    </div>
  );
};

export default GoogleMap;