from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session, joinedload

from fastapi.responses import HTMLResponse
import requests

import os

from app.database.database import get_db
from app.models.sqlalchemy.crime import Crime as DBcrime
from app.models.pydantic.crime import CrimeCreate, CrimeResponse, CrimeUpdate

router = APIRouter()

GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "YOUR_API_KEY_HERE")

@router.post("/crime", response_model=CrimeResponse)
async def create_crime(crime: CrimeCreate, db: Session = Depends(get_db)):
    # 住所を緯度経度に変換
    coordinates = geo_coding(crime.title)  # crime.title は住所

    db_crime = DBcrime(
        title=crime.title,  
        info=crime.info,
        lat=coordinates[0],  # 緯度
        lng=coordinates[1]   # 経度
    )
    db.add(db_crime)
    db.commit()
    db.refresh(db_crime)
    return db_crime

@router.get("/crime/all")
def read_crime_all(db: Session = Depends(get_db)):
    try:
        crimes_data = db.query(DBcrime).all()
        results = [
            {
                "id": crime.id,
                "title": crime.title,
                "info": crime.info,
                "lat": crime.lat,
                "lng": crime.lng,
                "created_at": crime.created_at.isoformat() if crime.created_at else None,
                "updated_at": crime.updated_at.isoformat() if crime.updated_at else None,
            }
            for crime in crimes_data
        ]
        locations = get_locations(crimes_data)
        return JSONResponse(content=locations)
        # return JSONResponse(content=results)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/crime/{crime_id}", response_model=CrimeResponse)
def read_crime_by_id(crime_id: int, db: Session = Depends(get_db)):
    db_crime = db.query(DBcrime).filter(DBcrime.id == crime_id).first()
    if db_crime is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="crime not found")
    return db_crime


@router.put("/crime/{crime_id}", response_model=CrimeResponse)
async def update_crime(crime_id: int, crime_update: CrimeUpdate, db: Session = Depends(get_db)):
    try:
        db_crime = db.query(DBcrime).filter(DBcrime.id == crime_id).first()
        if db_crime is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="crime not found")

        for key, value in crime_update.dict(exclude_unset=True).items():
            setattr(db_crime, key, value)

        db.commit()
    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    finally:
        db.refresh(db_crime)
        return db_crime


@router.delete("/crime/{crime_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_crime(crime_id: int, db: Session = Depends(get_db)):
    db_crime = db.query(DBcrime).filter(DBcrime.id == crime_id).first()
    if db_crime is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="crime not found")

    db.delete(db_crime)
    db.commit()

# 位置情報データを返すAPI
@router.get("/api/locations")
def get_locations(crimes_data):
    # 取得した犯罪データから必要な情報を抽出
    locations = []
    for crime in crimes_data:
        try:
            # 既に犯罪データに含まれている緯度経度情報を使用
            locations.append({
                "position": {"lat": crime.lat, "lng": crime.lng},
                "title": crime.title,
                "info": crime.info
            })
        except Exception as e:
            print(f"Error processing crime {crime.title}: {e}")
            # エラー時はダミーデータを使用（実際のアプリではより適切なエラーハンドリングが必要）
            locations.append({
                "position": {"lat": 35.4096218 + (len(locations) * 0.01), "lng": 136.754722},
                "title": crime.title,
                "info": crime.info + " (位置情報取得エラー)"
            })
    
    
    # data_list = [
    #     {"発生場所": "各務原市那加西那加町", "詳細": "帰宅中の女子学生に対し、男が車で後をつける事案が発生しました。"},
    #     {"発生場所": "恵那市長島町正家", "詳細": "帰宅中の児童らに対し、男が手を振ったり、女がスマートフォンを向ける事案が発生しました。"},
    #     {"発生場所": "岐阜市中１丁目", "詳細": "下校中の児童らに対し、男が携帯電話機を向ける事案が発生しました。"},
    #     {"発生場所": "岐阜市中西郷", "詳細": "下校中の児童らに対し、男が携帯電話機のカメラを向ける事案が発生しました。"}
    # ]
    
    # 各地点の座標を取得
    # locations = []
    # for data in data_list:
    #     try:
    #         coordinates = geo_coding(data["発生場所"])
    #         locations.append({
    #             "position": {"lat": coordinates[0], "lng": coordinates[1]},
    #             "title": data["発生場所"],
    #             "info": data["詳細"]
    #         })
    #     except Exception as e:
    #         print(f"Error geocoding {data['発生場所']}: {e}")
    #         # エラー時はダミーデータを使用（実際のアプリではより適切なエラーハンドリングが必要）
    #         locations.append({
    #             "position": {"lat": 35.4096218 + (len(locations) * 0.01), "lng": 136.754722},
    #             "title": data["発生場所"],
    #             "info": data["詳細"] + " (位置情報取得エラー)"
    #         })
    
    return {"locations": locations, "apiKey": GOOGLE_MAPS_API_KEY}

# 住所から緯度経度を取得
def geo_coding(address):
    try:
        # Google Maps Geocoding APIを使用
        url = f"https://maps.googleapis.com/maps/api/geocode/json?address={address}&key={GOOGLE_MAPS_API_KEY}"
        response_data = requests.get(url)
        data = response_data.json()
        
        if data['status'] == 'OK':
            location = data['results'][0]['geometry']['location']
            return [location['lat'], location['lng']]  # [経度, 緯度]
        else:
            # APIからエラーが返された場合
            raise Exception(f"Geocoding API returned: {data['status']}")
    except Exception as e:
        # リクエストに問題があった場合
        raise Exception(f"Request error: {str(e)}")
    

