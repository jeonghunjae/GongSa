const express = require('express');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const querystring = require('querystring');
const { Database } = require('@sqlitecloud/drivers'); // SQLiteCloud 드라이버 require로 변경

const app = express();

// 뷰 엔진 및 정적 파일 설정
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// SQLiteCloud 데이터베이스 설정
const db = new Database('sqlitecloud://cahlaaimhz.sqlite.cloud:8860?apikey=sUeUH5MOb1Yx1F5MHaawodHQbbzO88gMA0XpYuNH3DU');

// 데이터베이스 선택 함수
const useDatabase = async () => {
  try {
    await db.sql`USE DATABASE database.sqlite;`; // 실제 데이터베이스 이름으로 바꾸세요.
    console.log('Database selected');
  } catch (error) {
    console.error('Error selecting database:', error);
    throw error; // 문제 발생 시 실행 중단
  }
};


// Companies 테이블
const initializeCompaniesTable = async () => {
  try {
    await db.sql`
      CREATE TABLE IF NOT EXISTS companies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company TEXT NOT NULL,
        trade TEXT NOT NULL,
        isCompleted BOOLEAN DEFAULT false,
        order_index INTEGER
      );
    `;
    console.log('Companies table initialized');
  } catch (error) {
    console.error('Error initializing companies table:', error);
  }
};

// Equipments 테이블
const initializeEquipmentsTable = async () => {
  try {
    await db.sql`
      CREATE TABLE IF NOT EXISTS equipments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        equipmentName TEXT NOT NULL,
        specification TEXT
      );
    `;
    console.log('Equipments table initialized');
  } catch (error) {
    console.error('Error initializing equipments table:', error);
  }
};

// WorkDetails 테이블
const initializeWorkDetailsTable = async () => {
  try {
    await db.sql`
      CREATE TABLE IF NOT EXISTS work_details (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date DATE NOT NULL,
        companyId INTEGER NOT NULL,
        personnel_count INTEGER NOT NULL,
        description TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (companyId) REFERENCES companies(id) ON DELETE CASCADE
      );
    `;
    console.log('WorkDetails table initialized');
  } catch (error) {
    console.error('Error initializing work_details table:', error);
  }
};

// Materials 테이블
const initializeMaterialsTable = async () => {
  try {
    await db.sql`
      CREATE TABLE IF NOT EXISTS materials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        materialName TEXT NOT NULL,
        specification TEXT NOT NULL,
        unit TEXT NOT NULL
      );
    `;
    console.log('Materials table initialized');
  } catch (error) {
    console.error('Error initializing materials table:', error);
  }
};

// WorkEquipments 테이블 (WorkDetails와 Equipments 간 다대다 관계를 위한 조인 테이블)
const initializeWorkEquipmentsTable = async () => {
  try {
    await db.sql`
      CREATE TABLE IF NOT EXISTS work_equipments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workDetailId INTEGER NOT NULL,
        equipmentId INTEGER NOT NULL,
        equipmentCount INTEGER NOT NULL,
        FOREIGN KEY (workDetailId) REFERENCES work_details(id) ON DELETE CASCADE,
        FOREIGN KEY (equipmentId) REFERENCES equipments(id) ON DELETE CASCADE
      );
    `;
    console.log('WorkEquipments table initialized');
  } catch (error) {
    console.error('Error initializing work_equipments table:', error);
  }
};

// Weather 테이블
const initializeWeatherTable = async () => {
  try {
    await db.sql`
      CREATE TABLE IF NOT EXISTS weather (
        date DATE PRIMARY KEY,
        minTemp TEXT NOT NULL,
        maxTemp TEXT NOT NULL,
        weatherCondition TEXT NOT NULL
      );
    `;
    console.log('Weather table initialized');
  } catch (error) {
    console.error('Error initializing weather table:', error);
  }
};

// Site 테이블
const initializeSiteTable = async () => {
  try {
    await db.sql`
      CREATE TABLE IF NOT EXISTS sites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        siteName TEXT NOT NULL
      );
    `;
    console.log('Sites table initialized');
  } catch (error) {
    console.error('Error initializing site table:', error);
  }
};

// MaxRows 테이블
const initializeMaxRowsTable = async () => {
  try {
    await db.sql`
      CREATE TABLE IF NOT EXISTS max_rows (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pageName TEXT NOT NULL UNIQUE,
        maxRows INTEGER NOT NULL DEFAULT 50
      );
    `;
    console.log('MaxRows table initialized');
  } catch (error) {
    console.error('Error initializing max_rows table:', error);
  }
};

// DailyMaterials 테이블
const initializeDailyMaterialsTable = async () => {
  try {
    await db.sql`
      CREATE TABLE IF NOT EXISTS daily_materials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date DATE NOT NULL,
        materialId INTEGER NOT NULL,
        quantity DECIMAL(10, 3) NOT NULL,
        FOREIGN KEY (materialId) REFERENCES materials(id) ON DELETE CASCADE
      );
    `;
    console.log('DailyMaterials table initialized');
  } catch (error) {
    console.error('Error initializing daily_materials table:', error);
  }
};

// 모든 테이블을 초기화하는 함수
const initializeAllTables = async () => {
  try {
    await initializeCompaniesTable();
    await initializeEquipmentsTable();
    await initializeWorkDetailsTable();
    await initializeMaterialsTable();
    await initializeWorkEquipmentsTable();
    await initializeWeatherTable();
    await initializeSiteTable();
    await initializeMaxRowsTable();
    await initializeDailyMaterialsTable();
    console.log('All tables have been initialized and synchronized!');
  } catch (error) {
    console.error('Error initializing tables:', error);
    throw error;
  }
};

// 데이터베이스 초기화 실행
(async () => {
  try {
    await useDatabase();         // 데이터베이스 선택 후
    await initializeAllTables(); // 테이블 초기화 진행
  } catch (error) {
    console.error("Failed to initialize database:", error);
  }
})();

// 라우트 설정

// 업체 추가 페이지 라우트 수정
app.get('/create-company', async (req, res) => {
  const companiesList = await db.sql`SELECT * FROM companies ORDER BY company ASC;`;
  res.render('create-company', { companies: companiesList });
});

// 업체명 추가 처리
app.post('/create-company', async (req, res) => {
  const { company, trade } = req.body;
  const currentTime = new Date().toISOString(); // 현재 시간을 ISO 형식으로 얻음

  try {
    // 현재 가장 큰 order_index 값을 가져와서 +1
    const maxOrderIndexResult = await db.sql`SELECT IFNULL(MAX(order_index), 0) AS maxOrderIndex FROM companies;`;
    const nextOrderIndex = maxOrderIndexResult[0]?.maxOrderIndex + 1;

    await db.sql`
      INSERT INTO companies (company, trade, createdAt, updatedAt, order_index)
      VALUES (${company}, ${trade}, ${currentTime}, ${currentTime}, ${nextOrderIndex});
    `;

    res.redirect('/create-company');
  } catch (error) {
    console.error('Error creating company:', error);
    res.status(500).send('Server Error');
  }
});


// 업체명 수정 처리
app.post('/update-company/:id', async (req, res) => {
  try {
    const { company, trade, isCompleted } = req.body;
    const companyId = req.params.id;  // URL에서 companyId를 받아옴

    // 체크박스 값이 'on'인 경우 true, 아니면 false로 처리
    const isCompletedValue = isCompleted === 'on' ? true : false;
    const updatedTime = new Date().toISOString(); // 현재 시간을 ISO 형식으로 얻음

    if (!companyId) {
      return res.status(400).json({ message: 'companyId가 제공되지 않았습니다.' });
    }

    await db.sql`
      UPDATE companies
      SET company = ${company},
          trade = ${trade},
          isCompleted = ${isCompletedValue},
          updatedAt = ${updatedTime}
      WHERE id = ${companyId};
    `;

    res.redirect('/create-company'); // 수정 후 목록 페이지로 리다이렉트

  } catch (error) {
    console.error('Error updating company:', error);
    res.status(500).send('Server Error');
  }
});

// 작업 완료 상태 업데이트 라우트
app.post('/update-company-status/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { isCompleted } = req.body;
    const updatedTime = new Date().toISOString(); // 현재 시간을 ISO 형식으로 얻음

    // 해당 회사의 작업 완료 상태 업데이트
    await db.sql`
      UPDATE companies
      SET isCompleted = ${isCompleted},
          updatedAt = ${updatedTime}
      WHERE id = ${id};
    `;

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating completion status:', error);
    res.status(500).json({ success: false });
  }
});



// 업체명 삭제 처리
app.post('/delete-company/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // 1. 먼저 work_details에서 해당 companyId와 관련된 데이터를 모두 삭제
    await db.sql`
      DELETE FROM work_details WHERE companyId = ${id};
    `;

    // 2. 이후 companies 테이블에서 해당 companyId를 삭제
    await db.sql`
      DELETE FROM companies WHERE id = ${id};
    `;

    // 3. 삭제 완료 후 회사 생성 페이지로 리다이렉트
    res.redirect('/create-company');
  } catch (error) {
    console.error('업체 및 관련 데이터 삭제 중 오류 발생:', error);
    res.status(500).send('삭제 중 오류가 발생했습니다.');
  }
});




// 입력 페이지 라우트
app.get('/', async (req, res) => { 
  // 오늘의 날짜를 UTC 기준으로 가져온 후, 9시간을 더해 한국 시간으로 맞춥니다.
  const now = new Date();
  const koreaTime = new Date(now.getTime() + (9 * 60 * 60 * 1000)); // 9시간 더해 KST로 변환
  const today = koreaTime.toISOString().split('T')[0]; // YYYY-MM-DD 형식으로 변환

  // 오늘의 날씨 데이터가 있는지 확인합니다.
  const weatherExists = await db.sql`SELECT * FROM weather WHERE date = ${today} LIMIT 1;`;

  if (!weatherExists) {
    // 날씨 데이터가 없으면 API를 호출하여 데이터를 가져옵니다.
    await getWeatherData();
  }

  // 완료되지 않은 업체만 가져옵니다.
  const companiesList = await db.sql`
  SELECT * FROM companies 
  WHERE isCompleted = false 
  ORDER BY company ASC;
  `;

  const equipmentsList = await db.sql`SELECT * FROM equipments ORDER BY equipmentName ASC;`;
  res.render('input', { companies: companiesList, equipments: equipmentsList, today });
});


// 공사일보 데이터 처리 라우트
app.post('/create', async (req, res) => {
  try {
    const { date, companyIds, equipmentNames, equipmentSpecifications, equipmentCounts } = req.body;

    if (!companyIds) {
      return res.status(400).send('최소 한 개의 업체를 선택해야 합니다.');
    }

    const companyIdArray = Array.isArray(companyIds) ? companyIds : [companyIds];

    for (let companyId of companyIdArray) {
      const personnel_count = req.body[`personnel_count_${companyId}`];
      const description = req.body[`description_${companyId}`];

      if (!personnel_count || !description) {
        continue; // 필수 입력값이 없으면 건너뜀
      }

      // 새로운 작업 세부 사항 추가
      await db.sql`
        INSERT INTO work_details (date, companyId, personnel_count, description, createdAt, updatedAt)
        VALUES (${date}, ${companyId}, ${personnel_count}, ${description}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;

      // 삽입된 work_details의 ID를 가져오기 위해 lastInsertRowid를 사용
      const workDetailIdResult = await db.sql`SELECT last_insert_rowid() AS id;`;
      const workDetailId = workDetailIdResult[0].id;

      // 해당 회사에 맞는 장비 데이터 처리
      const companyEquipmentNames = req.body[`equipmentNames_${companyId}`] || [];
      const companyEquipmentSpecifications = req.body[`equipmentSpecifications_${companyId}`] || [];
      const companyEquipmentCounts = req.body[`equipmentCounts_${companyId}`] || [];

      // 장비 연결: 장비명이 있고, 그에 따른 규격과 수량이 입력된 경우에만 연결
      for (let i = 0; i < companyEquipmentNames.length; i++) {
        const equipmentName = companyEquipmentNames[i];
        const specification = companyEquipmentSpecifications[i];
        const equipmentCount = companyEquipmentCounts[i];

        // 장비명을 기준으로 해당 장비의 ID를 찾음
        const equipmentResult = await db.sql`
          SELECT id FROM equipments
          WHERE equipmentName = ${equipmentName} AND specification = ${specification}
          LIMIT 1;
        `;

        if (equipmentResult.length > 0) {
          const equipmentId = equipmentResult[0].id;

          // 해당 장비가 있을 경우에만 work_equipments에 추가
          await db.sql`
            INSERT INTO work_equipments (workDetailId, equipmentId, equipmentCount, createdAt, updatedAt)
            VALUES (${workDetailId}, ${equipmentId}, ${equipmentCount}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
          `;
        }
      }
    }

    // 성공적으로 완료되었으면 success 페이지로 리다이렉트
    res.redirect('/success');
  } catch (error) {
    console.error('작업 세부 사항 추가 중 오류 발생:', error);
    res.status(500).send('작업 세부 사항 추가 중 오류가 발생했습니다.');
  }
});






// 성공 페이지 라우트
app.get('/success', (req, res) => {
  res.render('success');
});

// 관리 페이지 라우트
app.get('/manage', async (req, res) => {
  const { date, company } = req.query;
  
  // 선택된 날짜가 없으면 오늘 날짜로 설정
  const selectedDate = req.query.date || (() => {
    const now = new Date();
    const koreaTime = new Date(now.getTime() + (9 * 60 * 60 * 1000)); // 9시간 더해 KST로 변환
    return koreaTime.toISOString().split('T')[0]; // YYYY-MM-DD 형식으로 변환
  })();

  

  // WorkStatusFinalPaper와 ManpowerFinalPaper의 maxRows 값 불러오기
  const maxRowsWorkStatusSetting = await db.sql`SELECT maxRows FROM max_rows WHERE pageName = 'WorkStatusFinalPaper' LIMIT 1;`;
  const maxRowsManpowerSetting = await db.sql`SELECT maxRows FROM max_rows WHERE pageName = 'ManpowerFinalPaper' LIMIT 1;`;

  // 기본값 설정
  const maxRowsWorkStatus = maxRowsWorkStatusSetting[0]?.maxRows || 50;
  const maxRowsManpower = maxRowsManpowerSetting[0]?.maxRows || 88;

  // 모든 완료되지 않은 업체 리스트 가져오기
  const companiesList = await db.sql`SELECT * FROM companies WHERE isCompleted = false ORDER BY company ASC;`;



  // 모든 현장명 리스트 가져오기
  let sites = [];
  try {
    sites = await db.sql`SELECT * FROM sites ORDER BY siteName ASC;`;
  } catch (error) {
    console.error('Error fetching sites:', error);
    // 필요하다면 에러 처리를 추가하세요.
  }

  // 조건 설정
  const whereClause = { date: selectedDate }; // 날짜 필터를 항상 적용
  if (company) {
    whereClause.companyId = company;
  }


  // 작성된 공사일보 정보와 해당 업체 정보 JOIN
  const writtenCompanies = await db.sql`
  SELECT wd.*, c.company AS companyName, c.trade, 
        GROUP_CONCAT(e.equipmentName || ' (' || we.equipmentCount || ')', ', ') AS equipmentList
  FROM work_details wd
  JOIN companies c ON wd.companyId = c.id
  LEFT JOIN work_equipments we ON wd.id = we.workDetailId
  LEFT JOIN equipments e ON we.equipmentId = e.id
  WHERE wd.date = ${whereClause.date} 
    AND c.isCompleted = false
  GROUP BY wd.companyId, wd.date
  ORDER BY wd.companyId ASC;
  `;

// 중복된 업체 조회
const duplicateCompanies = await db.sql`
  SELECT wd.id AS workDetailId, wd.companyId, wd.description, wd.personnel_count, c.company AS companyName, c.trade,
         e.equipmentName, we.equipmentCount, wd.date
  FROM work_details wd
  JOIN companies c ON wd.companyId = c.id
  LEFT JOIN work_equipments we ON wd.id = we.workDetailId
  LEFT JOIN equipments e ON we.equipmentId = e.id
  WHERE wd.date = ${selectedDate}  -- 특정 날짜에 해당하는 데이터만 조회
    AND c.isCompleted = false
  ORDER BY c.company, wd.date, wd.id;
`;

  // 작성된 업체 ID 목록 추출
  const writtenCompanyIds = writtenCompanies.map((work) => work.companyId);

  // 작성되지 않은 업체 목록 구하기
  let notWrittenCompanies = [];
  notWrittenCompanies = await db.sql`
    SELECT c.*
    FROM companies c
    LEFT JOIN work_details wd ON c.id = wd.companyId AND wd.date = ${selectedDate}
    WHERE wd.companyId IS NULL
      AND c.isCompleted = false
    ORDER BY c.company ASC;
  `;


  res.render('manage', {
    companies: companiesList,
    writtenCompanies,
    notWrittenCompanies,
    sites, // 추가: 현장명 리스트를 템플릿에 전달
    maxRowsWorkStatus,
    maxRowsManpower,
    selectedDate, // 선택된 날짜를 템플릿에 전달
    duplicateCompanies,
  });
});

// 데이터베이스 초기화 라우트
app.get('/reset-database', async (req, res) => {
  try {
    // work_details 테이블만 삭제하고 다시 생성
    await WorkDetails.sync({ force: true });

    console.log('work_details table has been reset and recreated!');
    res.redirect('/manage');
  } catch (error) {
    console.error('Error resetting the work_details table:', error);
    res.status(500).send('work_details 테이블 초기화 중 오류가 발생했습니다.');
  }
});

// 수정 처리 라우트 (AJAX 요청 처리)
app.post('/update-work/:id', async (req, res) => {
  const { id } = req.params;
  const { personnel_count, description } = req.body;

  console.log('Received update request:', { id, personnel_count, description }); // 로그 추가

  try {
    // 작업 세부사항 업데이트
    await db.sql`
      UPDATE work_details
      SET personnel_count = ${personnel_count}, description = ${description}
      WHERE id = ${id}
    `;

    res.status(200).json({ message: '수정 완료' });
  } catch (error) {
    console.error('작업 세부사항 수정 중 오류 발생:', error); // 오류 로그 추가
    res.status(500).json({ message: '수정 중 오류가 발생했습니다.' });
  }
});

app.post('/delete-work/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // SQLiteCloud를 통해 데이터 삭제
    await db.sql`DELETE FROM work_details WHERE id = ${id}`;

    res.status(200).json({ message: '삭제 완료' });
  } catch (error) {
    console.error('작업 세부사항 삭제 중 오류 발생:', error);
    res.status(500).json({ message: '삭제 중 오류가 발생했습니다.' });
  }
});


// 자재 조회 라우트
app.get('/view-materials', async (req, res) => {
  const { date } = req.query;

  try {
    // 자재와 관련된 정보를 조회하기 위한 쿼리
    const materials = await db.sql`
      SELECT dm.id, dm.quantity, dm.date, m.materialName, m.specification
      FROM daily_materials dm
      JOIN materials m ON dm.materialId = m.id
      WHERE dm.date = ${date}
      ORDER BY m.materialName ASC;
    `;

    res.render('view-materials', { materials });
  } catch (error) {
    console.error('Error fetching materials:', error);
    res.status(500).send('자재 목록을 불러오는 중 오류가 발생했습니다.');
  }
});


// 라우트: 자재 수정 처리
app.post('/update-materials', async (req, res) => {
  const { materialIds, quantities } = req.body;

  if (!materialIds || !quantities) {
      return res.status(400).send('자재 ID 및 수량이 필요합니다.');
  }

  try {
      // 여러 자재의 수량을 업데이트합니다.
      for (let i = 0; i < materialIds.length; i++) {
          const materialId = materialIds[i];
          const quantity = quantities[i];

          await db.sql`
            UPDATE daily_materials
            SET quantity = ${quantity}
            WHERE id = ${materialId};
          `;
      }

      res.redirect(`/view-materials?date=${req.body.date}`);
  } catch (error) {
      console.error('Error updating materials:', error);
      res.status(500).send('자재 수정 중 오류가 발생했습니다.');
  }
});

// 라우트: 자재 삭제 처리
app.delete('/delete-material/:id', async (req, res) => {
  const materialId = req.params.id;

  try {
      // 자재 삭제
      await db.sql`
        DELETE FROM daily_materials
        WHERE id = ${materialId};
      `;


      res.status(200).send('자재가 삭제되었습니다.');
  } catch (error) {
      console.error('Error deleting material:', error);
      res.status(500).send('자재 삭제 중 오류가 발생했습니다.');
  }
});


// 자재 관리 페이지 라우트
app.get('/manage-materials', async (req, res) => {
  const materialsList = await db.sql`
    SELECT *
    FROM materials
    ORDER BY materialName ASC;
  `;
  res.render('materials', { materials: materialsList });
});

// 자재 추가 처리
app.post('/add-material', async (req, res) => {
  const { materialName, specification, unit } = req.body;
  const currentTime = new Date().toISOString(); // 현재 시간을 ISO 형식으로 얻음

  try {
    await db.sql`
      INSERT INTO materials (materialName, specification, unit, createdAt, updatedAt)
      VALUES (${materialName}, ${specification}, ${unit}, ${currentTime}, ${currentTime});
    `;
    res.redirect('/manage-materials');
  } catch (error) {
    console.error('Error adding material:', error);
    res.status(500).send('자재 추가 중 오류가 발생했습니다.');
  }
});


// 자재 수정 페이지 라우트
app.get('/update-material/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // materials 테이블에서 해당 id에 해당하는 자재를 가져옴
    const material = await db.sql`
      SELECT *
      FROM materials
      WHERE id = ${id}
      LIMIT 1;
    `;

    if (material.length === 0) {
      return res.status(404).send('해당 자재를 찾을 수 없습니다.');
    }

    res.render('update-material', { material: material[0] });
  } catch (error) {
    console.error('Error fetching material:', error);
    res.status(500).send('자재 데이터를 가져오는 중 오류가 발생했습니다.');
  }
});


// 자재 수정 처리
app.post('/update-material/:id', async (req, res) => {
  const { id } = req.params;
  const { materialName, specification, unit } = req.body;

  await db.sql`
    UPDATE materials
    SET materialName = ${materialName}, specification = ${specification}, unit = ${unit}
    WHERE id = ${id};
  `;

  res.redirect('/manage-materials');
});

app.post('/delete-material/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    // 먼저 DailyMaterials에서 해당 자재를 참조하는 데이터를 삭제
    await db.sql`
      DELETE FROM daily_materials
      WHERE materialId = ${id};
    `;

    // 그 후 자재 삭제
    await db.sql`
      DELETE FROM materials
      WHERE id = ${id};
    `;


    res.redirect('/manage-materials');
  } catch (error) {
    console.error('Error deleting material:', error);
    res.status(500).send('자재 삭제 중 오류가 발생했습니다.');
  }
});

// 자재 입력 페이지 라우트
app.get('/input-materials', async (req, res) => {
  try {
    const materialsList = await db.sql`
      SELECT materialName, unit
      FROM materials
      GROUP BY materialName, unit
      ORDER BY materialName ASC;
    `;

    const materialSpecifications = {};

    for (let material of materialsList) {
      const specifications = await db.sql`
        SELECT id, specification 
        FROM materials 
        WHERE materialName = ${material.materialName} 
        ORDER BY CAST(specification AS INTEGER) ASC;
      `;

      materialSpecifications[material.materialName] = specifications.map(spec => ({
        id: spec.id,
        specification: spec.specification,
      }));
    }
    

    res.render('input-materials', { materials: materialsList, materialSpecifications });
  } catch (error) {
    console.error('Error fetching materials:', error);
    res.status(500).send('자재 목록을 불러오는 중 오류가 발생했습니다.');
  }
});


// 자재 입력 처리 라우트
app.post('/input-materials', async (req, res) => {
  try {
    const { date, materialIds, quantities } = req.body;

    if (!materialIds || !quantities) {
      return res.status(400).send('자재와 수량을 입력해야 합니다.');
    }

    const materialIdArray = Array.isArray(materialIds) ? materialIds : [materialIds];
    const quantityArray = Array.isArray(quantities) ? quantities : [quantities];

    for (let i = 0; i < materialIdArray.length; i++) {
      const materialId = materialIdArray[i];
      const quantity = quantityArray[i];

      if (!materialId || !quantity || isNaN(quantity)) {
        return res.status(400).send('유효하지 않은 자재 또는 수량이 입력되었습니다.');
      }

      const material = await db.sql`
        SELECT * FROM materials WHERE id = ${materialId} LIMIT 1;
      `;
      if (material.length === 0) {
        return res.status(404).send(`자재 ID ${materialId}을(를) 찾을 수 없습니다.`);
      }

      // 현재 시간을 `createdAt`, `updatedAt`으로 추가합니다.
      const createdAt = new Date().toISOString();
      const updatedAt = new Date().toISOString();

      // daily_materials 테이블에 데이터 추가, `createdAt` 및 `updatedAt` 필드 포함
      await db.sql`
        INSERT INTO daily_materials (date, materialId, quantity, createdAt, updatedAt)
        VALUES (${date}, ${materialId}, ${quantity}, ${createdAt}, ${updatedAt});
      `;
    }

    res.send("<script>alert('완료되었습니다.'); window.location.href='/input-materials';</script>");
  } catch (error) {
    console.error('Error saving material data:', error);
    res.status(500).send('자재 데이터를 저장하는 중 오류가 발생했습니다.');
  }
});




// 장비 관리 페이지 라우트
app.get('/manage-equipments', async (req, res) => {
  try {
    const equipmentsList = await db.sql`
      SELECT * 
      FROM equipments
      ORDER BY equipmentName ASC, CAST(specification AS INTEGER) ASC;
    `;

    res.render('manage-equipments', { equipments: equipmentsList });
  } catch (error) {
    console.error('Error fetching equipment list:', error);
    res.status(500).send('장비 목록을 불러오는 중 오류가 발생했습니다.');
  }
});


app.post('/add-equipment', async (req, res) => {
  const { equipmentName, specification } = req.body;
  const currentTime = new Date().toISOString(); // 현재 시간을 ISO 형식으로 얻음

  await db.sql`
    INSERT INTO equipments (equipmentName, specification, createdAt, updatedAt)
    VALUES (${equipmentName}, ${specification}, ${currentTime}, ${currentTime});
  `;
  res.redirect('/manage-equipments');
});


// 장비 수정 페이지 라우트
app.get('/update-equipment/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // equipments 테이블에서 해당 id에 해당하는 장비를 가져옴
    const equipment = await db.sql`
      SELECT *
      FROM equipments
      WHERE id = ${id}
      LIMIT 1;
    `;

    if (equipment.length === 0) {
      return res.status(404).send('해당 장비를 찾을 수 없습니다.');
    }

    res.render('update-equipment', { equipment: equipment[0] });
  } catch (error) {
    console.error('Error fetching equipment:', error);
    res.status(500).send('장비 데이터를 가져오는 중 오류가 발생했습니다.');
  }
});


// 장비 수정 처리
app.post('/update-equipment/:id', async (req, res) => {
  const { id } = req.params;
  const { equipmentName, specification } = req.body;

  await db.sql`
    UPDATE equipments
    SET equipmentName = ${equipmentName}, specification = ${specification}
    WHERE id = ${id};
  `;

  res.redirect('/manage-equipments');
});

// 장비 삭제 처리
app.post('/delete-equipment/:id', async (req, res) => {
  const { id } = req.params;
  await db.sql`
    DELETE FROM equipments
    WHERE id = ${id};
  `;

  res.redirect('/manage-equipments');
});

app.get('/ManpowerFinalPaper', async (req, res) => {
  try {
    // 선택된 날짜가 없으면 오늘 날짜로 설정
    const selectedDate = req.query.date || (() => {
      const now = new Date();
      const koreaTime = new Date(now.getTime() + (9 * 60 * 60 * 1000)); // 9시간 더해 KST로 변환
      return koreaTime.toISOString().split('T')[0]; // YYYY-MM-DD 형식으로 변환
    })();

    const previousDate = new Date(new Date(selectedDate).setDate(new Date(selectedDate).getDate() - 1));
    const formattedPreviousDate = previousDate.toISOString().split('T')[0];
    
    // 데이터베이스에서 ManpowerFinalPaper의 maxRows 값 불러오기
    let maxRows = 88; // 기본값 88
    try {
      const maxRowsSetting = await db.sql`
        SELECT maxRows FROM max_rows WHERE pageName = 'ManpowerFinalPaper' LIMIT 1;
      `;
      if (maxRowsSetting.length > 0) {
        maxRows = maxRowsSetting[0].maxRows;
      }
    } catch (error) {
      console.error('Error fetching maxRows:', error);
    }

    // 현장명을 데이터베이스에서 가져오기
    let siteName = '공사명'; // 기본값
    try {
      const siteResult = await db.sql`
        SELECT siteName FROM sites LIMIT 1;
      `;
      if (siteResult.length > 0) {
        siteName = siteResult[0].siteName;
      }
    } catch (error) {
      console.error('Error fetching site name:', error);
    }

    // 날씨 데이터 가져오기
    let weatherData;
    try {
      let weatherResult = await db.sql`
        SELECT * FROM weather WHERE date = ${selectedDate} LIMIT 1;
      `;

      if (weatherResult.length > 0) {
        weatherData = weatherResult[0];
      } else {
        // 선택한 날짜가 오늘이라면, API를 호출하여 날씨 데이터를 가져옵니다.
        const today = new Date().toISOString().split('T')[0];
        if (selectedDate === today) {
          await getWeatherData(); // 날씨 데이터를 가져오는 함수 호출
          weatherResult = await db.sql`
            SELECT * FROM weather WHERE date = ${selectedDate} LIMIT 1;
          `;

          if (weatherResult.length > 0) {
            weatherData = weatherResult[0];
          } else {
            console.log(`${selectedDate}의 날씨 데이터가 없습니다.`);
          }
        } else {
          console.log(`${selectedDate}의 날씨 데이터가 없습니다.`);
        }
      }
    } catch (error) {
      console.error('Error fetching weather data:', error);
    }


    const weather = weatherData ? weatherData.weatherCondition : '정보 없음';
    const lowTemp = weatherData ? `${weatherData.minTemp} °C` : '정보 없음';
    const highTemp = weatherData ? `${weatherData.maxTemp} °C` : '정보 없음';


    // 모든 자재, 장비, 업체 목록을 미리 가져옵니다.
    const allMaterials = await db.sql`
    SELECT * 
    FROM materials
    ORDER BY id ASC;
    `;

    const allEquipments = await db.sql`
    SELECT * 
    FROM equipments
    ORDER BY id ASC;
    `;

    // 모든 업체를 가져올 때 쿼리 파라미터에 따라 완료된 업체 포함 여부 결정
    const showCompleted = req.query.showCompleted === 'true';
    let allCompanies;

    if (showCompleted) {
    allCompanies = await db.sql`
      SELECT companies.*, work_details.*
      FROM companies
      LEFT JOIN work_details ON companies.id = work_details.companyId AND work_details.date = ${selectedDate}
      ORDER BY companies.order_index ASC;
    `;
    } else {
    allCompanies = await db.sql`
      SELECT companies.*, work_details.*
      FROM companies
      LEFT JOIN work_details ON companies.id = work_details.companyId AND work_details.date = ${selectedDate}
      WHERE companies.isCompleted = false
      ORDER BY companies.order_index ASC;
    `;
    }

    // 선택한 날짜까지의 누적 자재 데이터 가져오기
    const cumulativeMaterials = await db.sql`
    SELECT daily_materials.*, materials.*
    FROM daily_materials
    JOIN materials ON daily_materials.materialId = materials.id
    WHERE daily_materials.date <= ${selectedDate}
    ORDER BY daily_materials.materialId ASC;
    `;

    // 선택한 날짜까지의 누적 작업 데이터 가져오기
    const cumulativeWorkDetails = await db.sql`
    SELECT work_details.*, companies.*
    FROM work_details
    JOIN companies ON work_details.companyId = companies.id
    WHERE work_details.date <= ${selectedDate}
    ORDER BY work_details.companyId ASC;
    `;

    // 누적 장비 데이터 가져오기
    const cumulativeEquipments = await db.sql`
    SELECT we.*, e.equipmentName, e.specification, wd.date
    FROM work_equipments we
    JOIN equipments e ON we.equipmentId = e.id
    JOIN work_details wd ON we.workDetailId = wd.id
    WHERE wd.date <= ${selectedDate}
    ORDER BY we.equipmentId ASC;
    `;


    // 자재, 장비, 업체 각각 전일-금일-누계 데이터를 처리
    const groupedMaterials = {};
    const groupedEquipments = {};
    const groupedWorkDetails = {};

    // 모든 자재 기본 값 설정
    allMaterials.forEach(material => {
      const key = `${material.materialName}-${material.specification}`;
      groupedMaterials[key] = {
        materialDetails: material,
        previousQuantity: 0,
        currentQuantity: 0,
        totalQuantity: 0 // 누적 합계
      };
    });

    // 누적 자재 데이터 처리
    cumulativeMaterials.forEach(material => {
      const key = `${material.materialName}-${material.specification}`;
      if (groupedMaterials[key]) {
        groupedMaterials[key].totalQuantity += material.quantity; // 누적 합계
        if (material.date === selectedDate) {
          groupedMaterials[key].currentQuantity = material.quantity; // 금일 자재량
        } else if (material.date === formattedPreviousDate) {
          groupedMaterials[key].previousQuantity = material.quantity; // 전일 자재량
        }
      }
    });

    // 모든 장비 기본 값 설정
    allEquipments.forEach(equipment => {
      const key = `${equipment.equipmentName}-${equipment.specification}`;
      groupedEquipments[key] = {
        equipmentName: equipment.equipmentName,
        specification: equipment.specification,
        previousUsage: 0,
        currentUsage: 0,
        totalUsage: 0 // 누적 합계
      };
    });

    // 누적 장비 데이터 처리
cumulativeEquipments.forEach(equipment => {
  const key = `${equipment.equipmentName}-${equipment.specification}`;

  if (!groupedEquipments[key]) {
    // 장비가 groupedEquipments에 없으면 기본값으로 초기화
    groupedEquipments[key] = {
      equipment: {
        equipmentName: equipment.equipmentName,
        specification: equipment.specification
      },
      previousUsage: 0,
      currentUsage: 0,
      totalUsage: 0
    };
  }

  // 누적 사용량 합계 계산
  groupedEquipments[key].totalUsage += equipment.equipmentCount;

  // 전일 및 금일 사용량을 구분해서 계산
  if (equipment.date === selectedDate) {
    groupedEquipments[key].currentUsage += equipment.equipmentCount;
  } else if (equipment.date === formattedPreviousDate) {
    groupedEquipments[key].previousUsage += equipment.equipmentCount;
  }
});




    // 모든 업체 기본 값 설정
    allCompanies.forEach(company => {
      const key = `${company.company}-${company.trade}`;
      groupedWorkDetails[key] = {
        companyDetails: company,
        previousPersonnel: 0,
        currentPersonnel: 0,
        totalPersonnel: 0 // 누적 합계
      };
    });

    // 누적 업체 데이터 처리
    cumulativeWorkDetails.forEach(workDetail => {
      const key = `${workDetail.company}-${workDetail.trade}`;
      if (groupedWorkDetails[key]) {
        groupedWorkDetails[key].totalPersonnel += workDetail.personnel_count; // 누적 합계
        if (workDetail.date === selectedDate) {
          groupedWorkDetails[key].currentPersonnel = workDetail.personnel_count; // 금일 출력
        } else if (workDetail.date === formattedPreviousDate) {
          groupedWorkDetails[key].previousPersonnel = workDetail.personnel_count; // 전일 출력
        }
      }
    });

    // 각 workDetail에 대해 선택된 날짜의 금일 출력 계산
    Object.values(groupedWorkDetails).forEach(detail => {
      detail.calculatePersonnelForSelectedDate = detail.currentPersonnel;
    });

    // 선택된 날짜의 출력 인원만 계산하는 함수
    const calculatePersonnelForSelectedDate = (workDetails, selectedDate) => {
      return workDetails.reduce((total, workDetail) => {
        if (workDetail.date === selectedDate) {
          return total + workDetail.personnel_count;
        }
        return total;
      }, 0);
    };

    //ManpowerFinalPaper.ejs용

    const formatDate = (date) => new Date(date).toISOString().split('T')[0];  // 'YYYY-MM-DD' 형식으로 변환

    const totalPersonnelToday = cumulativeWorkDetails.reduce((total, work) => {
      if (formatDate(work.date) === formatDate(selectedDate)) {
        return total + work.personnel_count;
      }
      return total;
    }, 0);
    

    // 전일 출력 인원 합계 계산
    const totalPersonnelPreviousDay = cumulativeWorkDetails.reduce((total, work) => {
      if (work.date === formattedPreviousDate) {
        return total + work.personnel_count;
      }
      return total;
    }, 0);

    // 누적 출력 인원 합계 계산 (선택된 날짜까지)
    const totalPersonnelCumulative = cumulativeWorkDetails.reduce((total, work) => {

      return total + work.personnel_count;
      
    }, 0);
    
    // 총 출력할 행 수 계산
    const totalRows = Math.max(
      Object.values(groupedMaterials).length,
      Object.values(groupedEquipments).length,
      Object.values(groupedWorkDetails).length
    );

    // 빈칸 채우기 위해 필요한 행 수 계산
    const emptyRows = maxRows - totalRows;

    res.render('ManpowerFinalPaper', {
      siteName,
      workDate: selectedDate,
      weather,
      lowTemp,
      highTemp,
      materials: Object.values(groupedMaterials),
      equipments: Object.values(groupedEquipments),
      workDetails: Object.values(groupedWorkDetails),
      totalPersonnelToday,
      totalPersonnelPreviousDay,
      totalPersonnelCumulative,
      maxRows, // maxRows 전송
      emptyRows, // 빈칸 채우기 위한 행 수
      showCompleted,
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).send('Error fetching data');
  }
});



// WorkStatusFinalPaper 라우트
app.get('/WorkStatusFinalPaper', async (req, res) => {
  try {

    const selectedDate = req.query.date || (() => {
      const now = new Date();
      const koreaTime = new Date(now.getTime() + (9 * 60 * 60 * 1000)); // 9시간 더해 KST로 변환
      return koreaTime.toISOString().split('T')[0]; // YYYY-MM-DD 형식으로 변환
    })();

    const previousDate = new Date(new Date(selectedDate).setDate(new Date(selectedDate).getDate() - 1));
    
    // 데이터베이스에서 WorkStatusFinalPaper의 maxRows 값 불러오기
    const maxRowsSetting = await db.sql`
    SELECT maxRows FROM max_rows WHERE pageName = 'WorkStatusFinalPaper' LIMIT 1;
  `;
  const maxRows = maxRowsSetting.length > 0 ? maxRowsSetting[0].maxRows : 50; // 값이 없으면 기본값 50

  // 현장명을 데이터베이스에서 가져오기
  const siteResult = await db.sql`
    SELECT siteName FROM sites LIMIT 1;
  `;
  const siteName = siteResult.length > 0 ? siteResult[0].siteName : "공사명"; // 만약 데이터가 없으면 기본값으로 "공사명" 사용

  // 날씨 데이터 가져오기
  let weatherData = await db.sql`
    SELECT * FROM weather WHERE date = ${selectedDate} LIMIT 1;
  `;
  if (weatherData.length === 0) {
    // 선택한 날짜가 오늘이라면, API를 호출하여 날씨 데이터를 가져옵니다.
    const today = new Date().toISOString().split('T')[0];
    if (selectedDate === today) {
      await getWeatherData();
      weatherData = await db.sql`
        SELECT * FROM weather WHERE date = ${selectedDate} LIMIT 1;
      `;
    } else {
      console.log(`${selectedDate}의 날씨 데이터가 없습니다.`);
    }
  }

  const weather = weatherData.length > 0 ? weatherData[0].weatherCondition : '정보 없음';
  const lowTemp = weatherData.length > 0 ? `${weatherData[0].minTemp} °C` : '정보 없음';
  const highTemp = weatherData.length > 0 ? `${weatherData[0].maxTemp} °C` : '정보 없음';
    


    // 금일 작업사항
    let workDetails = await db.sql`
      SELECT work_details.id, work_details.date, work_details.companyId, work_details.personnel_count, work_details.description, companies.company, companies.trade
      FROM work_details
      JOIN companies ON work_details.companyId = companies.id
      WHERE work_details.date = ${selectedDate} AND companies.company != '대우건설';
    `;

    // 전일 작업사항
    let previousWorkDetails = await db.sql`
      SELECT work_details.id, work_details.date, work_details.companyId, work_details.personnel_count, work_details.description, companies.company, companies.trade
      FROM work_details
      JOIN companies ON work_details.companyId = companies.id
      WHERE work_details.date = ${previousDate.toISOString().split('T')[0]} AND companies.company != '대우건설';
    `;


    // 금일 작업사항을 업체명 기준으로 정렬
    workDetails = workDetails.sort((a, b) => {
      const companyA = a.company ? a.company.toUpperCase() : '';
      const companyB = b.company ? b.company.toUpperCase() : '';
      return companyA.localeCompare(companyB); // 알파벳 순으로 정렬
    });

    // 전일 작업사항을 업체명 기준으로 정렬
    previousWorkDetails = previousWorkDetails.sort((a, b) => {
      const companyA = a.company ? a.company.toUpperCase() : '';
      const companyB = b.company ? b.company.toUpperCase() : '';
      return companyA.localeCompare(companyB); // 알파벳 순으로 정렬
    });


    // 렌더링할 템플릿에 필요한 데이터 전달
    res.render('WorkStatusFinalPaper', {
      siteName,
      workDate: selectedDate,
      weather,
      lowTemp,
      highTemp,
      workDetails, // 선택된 날짜의 작업 현황
      previousWorkDetails, // 전일 작업 현황
      maxRows, // 필요 시 사용
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).send('Error fetching data');
  }
});



// app.js 또는 서버 메인 파일에서
app.post('/update-work-description', async (req, res) => {
  const { workId, description } = req.body;

  console.log(`Received request to update workId: ${workId} with description: ${description}`);

  try {
      // 데이터베이스에서 해당 workId에 대한 description을 업데이트하고 updatedAt 갱신
      await db.sql`
        UPDATE work_details
        SET description = ${description}, updatedAt = CURRENT_TIMESTAMP
        WHERE id = ${workId};
      `;

      console.log('작업 내용이 성공적으로 업데이트되었습니다.');
      res.status(200).json({ message: '작업 내용이 성공적으로 업데이트되었습니다.' });
  } catch (error) {
      console.error('작업 내용 업데이트 중 오류 발생:', error);
      res.status(500).json({ message: '작업 내용 업데이트 중 오류가 발생했습니다.' });
  }
});




async function updateWorkDescription(workId, newDescription) {
  console.log(`Updating work description for workId: ${workId} with description: ${newDescription}`);
  try {
    const response = await fetch('/update-work-description', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ workId, description: newDescription }),
    });

    if (response.ok) {
      console.log('작업 내용이 성공적으로 업데이트되었습니다.');
    } else {
      console.error('작업 내용 업데이트에 실패했습니다.');
    }
  } catch (error) {
    console.error('작업 내용 업데이트 중 오류가 발생했습니다:', error);
  }
}


//날씨 api
// 날씨 데이터베이스 초기화 라우트 추가
app.get('/reset-weather-database', async (req, res) => {
  try {
    await Weather.sync({ force: true });
    console.log('Weather table has been reset and recreated!');
    res.send('날씨 데이터베이스가 초기화되었습니다.');
  } catch (error) {
    console.error('Error resetting the weather table:', error);
    res.status(500).send('날씨 데이터베이스 초기화 중 오류가 발생했습니다.');
  }
});




// 기존의 getWeatherData 함수 수정
async function getWeatherData() {
  const serviceKey = '5d%2FuSBS9DyxFodVGV5jsPfu2rnCycumgAN4iHkwDqA79ETt3Ss1fLHghWNlacVFufLTHj8R53ON%2FZULQbPKhEQ%3D%3D'; // 발급받은 서비스 키를 입력하세요.
  const decodedServiceKey = decodeURIComponent(serviceKey); // 서비스 키 디코딩
  const url = 'http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst';

  // 현재 날짜와 시간을 구합니다.
  const date = new Date();
  let baseDate = date.toISOString().split('T')[0].replace(/-/g, '');
  let hours = date.getHours();

  // API 제공 시간에 맞게 baseTime 설정
  let baseTime;
  if (hours >= 2 && hours < 5) {
    baseTime = '0200';
  } else if (hours >= 5 && hours < 8) {
    baseTime = '0500';
  } else if (hours >= 8 && hours < 11) {
    baseTime = '0800';
  } else if (hours >= 11 && hours < 14) {
    baseTime = '1100';
  } else if (hours >= 14 && hours < 17) {
    baseTime = '1400';
  } else if (hours >= 17 && hours < 20) {
    baseTime = '1700';
  } else if (hours >= 20 && hours < 23) {
    baseTime = '2000';
  } else {
    baseTime = '2300';
    // 자정 이후에는 baseDate를 전날로 변경
    baseDate = new Date(date.setDate(date.getDate() - 1)).toISOString().split('T')[0].replace(/-/g, '');
  }

  // 수원시의 격자 좌표
  const nx = 60;
  const ny = 121;

  const queryParams = '?' + querystring.stringify({
    ServiceKey: decodedServiceKey,
    pageNo: '1',
    numOfRows: '1000',
    dataType: 'JSON',
    base_date: baseDate,
    base_time: baseTime,
    nx: nx,
    ny: ny,
  });

  try {
    const response = await axios.get(url + queryParams);
    const items = response.data.response.body.items.item;

    // 필요한 데이터 필터링
    const weatherData = {};

    items.forEach(item => {
      if (item.category === 'TMN') {
        weatherData.minTemp = item.fcstValue; // 최저기온
      }
      if (item.category === 'TMX') {
        weatherData.maxTemp = item.fcstValue; // 최고기온
      }
      if (item.category === 'SKY' && !weatherData.weatherCondition) {
        const skyStatus = {
          '1': '맑음',
          '3': '구름 많음',
          '4': '흐림',
        };
        weatherData.weatherCondition = skyStatus[item.fcstValue];
      }
      if (item.category === 'PTY' && item.fcstValue !== '0') {
        const ptyStatus = {
          '1': '비',
          '2': '비/눈',
          '3': '눈',
          '4': '소나기',
        };
        weatherData.weatherCondition = ptyStatus[item.fcstValue];
      }
    });

    // 날짜를 'YYYY-MM-DD' 형식으로 변환
    const today = new Date().toISOString().split('T')[0];

    // Weather 테이블에 데이터 저장
    // 날씨 데이터 추가
    const currentTime = new Date().toISOString(); // 현재 시간을 ISO 형식으로 가져오기

    await db.sql`
      INSERT INTO weather (date, minTemp, maxTemp, weatherCondition, createdAt, updatedAt)
      VALUES (
        ${today}, 
        ${weatherData.minTemp || '-'}, 
        ${weatherData.maxTemp || '-'}, 
        ${weatherData.weatherCondition || '정보 없음'},
        ${currentTime},
        ${currentTime}
      );
    `;


    console.log('날씨 데이터가 데이터베이스에 저장되었습니다.');

    return weatherData;
  } catch (error) {
    console.error('API 호출 중 오류 발생:', error);
    return null;
  }
}

// 날씨 데이터 업데이트 라우트
app.post('/update-weather', async (req, res) => {
  const { weather } = req.body;
  const today = new Date().toISOString().split('T')[0];

  try {
    // 오늘의 날씨 데이터를 데이터베이스에서 찾습니다.
    const weatherDataResult = await db.sql`
      SELECT *
      FROM weather
      WHERE date = ${today}
      LIMIT 1;
    `;

    if (weatherDataResult.length === 0) {
      return res.status(404).send('오늘의 날씨 데이터가 없습니다.');
    }

    // 날씨 데이터를 업데이트합니다.
    await db.sql`
      UPDATE weather
      SET weatherCondition = ${weather}
      WHERE date = ${today};
    `;

    res.status(200).send('날씨가 성공적으로 업데이트되었습니다.');
  } catch (error) {
    console.error('Error updating weather:', error);
    res.status(500).send('날씨 업데이트 중 오류가 발생했습니다.');
  }
});

//현장명 관리

// 현장명 관리 페이지 라우트
app.get('/manage-sites', async (req, res) => {
  try {
    const sites = await db.sql`
      SELECT * 
      FROM sites
      ORDER BY siteName ASC;
    `;
    res.render('manage', { sites });
  } catch (error) {
    console.error('Error fetching sites:', error);
    res.status(500).send('Error fetching sites');
  }
});


// 현장명 추가 처리
app.post('/add-site', async (req, res) => {
  const { siteName } = req.body;
  await db.sql`
    INSERT INTO sites (siteName)
    VALUES (${siteName});
  `;
  res.redirect('/manage');
});

// 현장명 수정 처리
app.post('/update-site/:id', async (req, res) => {
  const { id } = req.params;
  const { siteName } = req.body;
  await db.sql`
    UPDATE sites
    SET siteName = ${siteName}
    WHERE id = ${id};
  `;
  res.redirect('/manage');
});

// 현장명 삭제 처리
app.post('/delete-site/:id', async (req, res) => {
  const { id } = req.params;
  await db.sql`
    DELETE FROM sites
    WHERE id = ${id};
  `;

  res.redirect('/manage');
});

//기상청 api 넣기
// API 키 추가
app.post('/add-api-key', async (req, res) => {
  try {
    const { apiKey } = req.body;
    await db.sql`
      INSERT INTO api_keys (apiKey)
      VALUES (${apiKey});
    `;
    res.redirect('/manage'); // 성공적으로 추가 후 manage 페이지로 리다이렉트
  } catch (error) {
    console.error('Error adding API key:', error);
    res.status(500).send('API 키 추가 중 오류가 발생했습니다.');
  }
});

// API 키 수정
app.post('/update-api-key/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { apiKey } = req.body;
    await db.sql`
      UPDATE api_keys
      SET apiKey = ${apiKey}
      WHERE id = ${id};
    `;

    res.redirect('/manage'); // 성공적으로 수정 후 manage 페이지로 리다이렉트
  } catch (error) {
    console.error('Error updating API key:', error);
    res.status(500).send('API 키 수정 중 오류가 발생했습니다.');
  }
});

// API 키 삭제
app.post('/delete-api-key/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.sql`
      DELETE FROM api_keys
      WHERE id = ${id};
    `;

    res.redirect('/manage'); // 성공적으로 삭제 후 manage 페이지로 리다이렉트
  } catch (error) {
    console.error('Error deleting API key:', error);
    res.status(500).send('API 키 삭제 중 오류가 발생했습니다.');
  }
});

/*sqlite를 직접 다운로드*/

// 현장명 가져오기 (데이터베이스에서)
const getSiteName = async () => {
  try {
    // 현장명 데이터베이스에서 가져오기
    const siteResult = await db.sql`
      SELECT siteName FROM sites LIMIT 1;
    `;
    // 현장명이 없을 경우 'UnknownSite' 반환
    return siteResult.length > 0 ? siteResult[0].siteName : 'UnknownSite';
  } catch (error) {
    console.error('Error fetching site name:', error);
    return 'UnknownSite'; // 에러 발생 시 기본값 반환
  }
  
};

// SQLite DB 파일 다운로드 라우트
app.get('/download-sqlite', async (req, res) => {
  const dbPath = path.join(__dirname, 'database.sqlite'); // SQLite DB 파일 경로

  // 파일이 존재하는지 확인
  fs.access(dbPath, fs.constants.F_OK, async (err) => {
    if (err) {
      console.error('SQLite 파일이 존재하지 않습니다:', err);
      return res.status(404).send('SQLite 파일을 찾을 수 없습니다.');
    }

    // 날짜 가져오기
    const currentDate = new Date().toISOString().split('T')[0]; // 현재 날짜 (YYYY-MM-DD 형식)

    // 현장명 가져오기
    const siteName = await getSiteName();

    // 파일 이름을 "database_YYYY-MM-DD_현장명.sqlite"로 설정
    const fileName = `database_${currentDate}_${siteName}.sqlite`;

    // 파일 다운로드 제공
    res.download(dbPath, fileName, (err) => {
      if (err) {
        console.error('파일 전송 중 오류가 발생했습니다:', err);
        res.status(500).send('파일을 전송하는 중 오류가 발생했습니다.');
      }
    });
  });
});

// maxRows 값 변경 API
app.post('/update-max-rows', async (req, res) => {
  const { pageName, maxRows } = req.body;

  try {
    // 페이지 이름에 해당하는 maxRows 값을 업데이트
    const existingSetting = await db.sql`
      SELECT * FROM max_rows WHERE pageName = ${pageName} LIMIT 1;
    `;
  
    if (existingSetting.length > 0) {
      // 기존 값 업데이트
      await db.sql`
        UPDATE max_rows SET maxRows = ${maxRows} WHERE pageName = ${pageName};
      `;
    } else {
      // 새로 추가
      await db.sql`
        INSERT INTO max_rows (pageName, maxRows) VALUES (${pageName}, ${maxRows});
      `;
    }

    res.status(200).json({ message: 'maxRows 값이 업데이트되었습니다.' });
  } catch (error) {
    console.error('Error updating maxRows:', error);
    res.status(500).json({ message: 'maxRows 업데이트 중 오류가 발생했습니다.' });
  }
});

// 업체 순서 관리 페이지
// 업체 순서 관리 및 업데이트 API에서도 필드명을 `order_index`로 변경
app.get('/manage-company-order', async (req, res) => {
  const companies = await db.sql`SELECT * FROM companies ORDER BY order_index ASC;`;
  res.render('manageCompanyOrder', { companies });
});

// 업체 순서 업데이트 API
app.post('/update-company-order', async (req, res) => {
  const { companyOrders } = req.body; // [{ id: 1, order: 1 }, { id: 2, order: 2 }, ...]

  try {
    for (const companyOrder of companyOrders) {
      await db.sql`UPDATE companies SET order_index = ${companyOrder.order_index} WHERE id = ${companyOrder.id};`;
    }
    res.status(200).json({ message: '업체 순서가 업데이트되었습니다.' });
  } catch (error) {
    console.error('업체 순서 업데이트 중 오류 발생:', error);
    res.status(500).json({ message: '업체 순서 업데이트 중 오류가 발생했습니다.' });
  }
});

app.get('/WorkStatusForSmaty', async (req, res) => {
  try {
    const selectedDate = req.query.date || (() => {
      const now = new Date();
      const koreaTime = new Date(now.getTime() + (9 * 60 * 60 * 1000)); // KST로 변환
      return koreaTime.toISOString().split('T')[0]; // YYYY-MM-DD 형식으로 변환
    })();

    // 데이터베이스에서 WorkStatusFinalPaper의 maxRows 값 불러오기
  const maxRowsSetting = await db.sql`
    SELECT maxRows FROM max_rows WHERE pageName = 'WorkStatusForSmaty' LIMIT 1;
  `;
  const maxRows = maxRowsSetting.length > 0 ? maxRowsSetting[0].maxRows : 50; // 기본값 50

  // 현장명과 작업 내역을 데이터베이스에서 가져오기
  const siteResult = await db.sql`
    SELECT siteName FROM sites LIMIT 1;
  `;
  const siteName = siteResult.length > 0 ? siteResult[0].siteName : "공사명"; // 데이터가 없을 경우 기본값 "공사명"


    // 금일 작업사항
    let workDetails = await db.sql`
      SELECT work_details.id, work_details.date, work_details.companyId, work_details.personnel_count, work_details.description, companies.company, companies.trade
      FROM work_details
      JOIN companies ON work_details.companyId = companies.id
      WHERE work_details.date = ${selectedDate};
    `;


    // 금일 작업사항을 업체명 기준으로 정렬
    workDetails = workDetails.sort((a, b) => {
      const companyA = a.company ? a.company.toUpperCase() : '';
      const companyB = b.company ? b.company.toUpperCase() : '';
      return companyA.localeCompare(companyB); // 알파벳 순으로 정렬
    });

    // 렌더링할 템플릿에 필요한 데이터 전달
    res.render('WorkStatusForSmaty', {
      siteName,
      workDate: selectedDate,
      workDetails, // 선택된 날짜의 작업 현황
      maxRows, // 필요 시 사용
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).send('Error fetching data');
  }
});


//한페이지
// CombinedFinalPaper 라우트
app.get('/CombinedFinalPaper', async (req, res) => {
  try {
    const selectedDate = req.query.date || new Date().toISOString().split('T')[0];
    const previousDate = new Date(new Date(selectedDate).setDate(new Date(selectedDate).getDate() - 1));
    const formattedPreviousDate = previousDate.toISOString().split('T')[0];

    try {
      // 현장명 가져오기
      const siteResult = await db.sql`
        SELECT siteName FROM sites LIMIT 1;
      `;
      const siteName = siteResult.length > 0 ? siteResult[0].siteName : "공사명";

      // 날씨 데이터 가져오기
      let weatherDataResult = await db.sql`
        SELECT * FROM weather WHERE date = ${selectedDate} LIMIT 1;
      `;
      
      if (weatherDataResult.length === 0 && selectedDate === new Date().toISOString().split('T')[0]) {
        await getWeatherData();  // 날씨 데이터를 가져오는 함수 호출
        weatherDataResult = await db.sql`
          SELECT * FROM weather WHERE date = ${selectedDate} LIMIT 1;
        `;
      }

      const weather = weatherDataResult.length > 0 ? weatherDataResult[0].weatherCondition : '정보 없음';
      const lowTemp = weatherDataResult.length > 0 ? `${weatherDataResult[0].minTemp} °C` : '정보 없음';
      const highTemp = weatherDataResult.length > 0 ? `${weatherDataResult[0].maxTemp} °C` : '정보 없음';
    } catch (error) {
      console.error('Error fetching data:', error);
    }

    // 금일 및 전일 작업사항 가져오기
    let workDetails, previousWorkDetails, allCompanies, materials, equipmentDetails;

    try {
      // 금일 작업사항
      workDetails = await db.sql`
        SELECT wd.id, wd.description, wd.companyId, wd.personnel_count, c.company AS companyDetails
        FROM work_details wd
        JOIN companies c ON wd.companyId = c.id
        WHERE wd.date = ${selectedDate};
      `;

      // 전일 작업사항
      previousWorkDetails = await db.sql`
        SELECT wd.id, wd.description, wd.companyId, wd.personnel_count, c.company AS companyDetails
        FROM work_details wd
        JOIN companies c ON wd.companyId = c.id
        WHERE wd.date = ${formattedPreviousDate};
      `;

      // 모든 업체 가져오기
      allCompanies = await db.sql`
        SELECT c.*, wd.id AS workDetailId, wd.date, wd.description
        FROM companies c
        LEFT JOIN work_details wd ON c.id = wd.companyId AND wd.date = ${selectedDate}
        ORDER BY c_index ASC;
      `;

      // 자재 데이터 가져오기
      materials = await db.sql`
        SELECT dm.id, dm.quantity, dm.date, m.materialName, m.specification, m.unit
        FROM daily_materials dm
        JOIN materials m ON dm.materialId = m.id
        WHERE dm.date = ${selectedDate}
        ORDER BY dm.materialId ASC;
      `;

      // 장비 현황 데이터 가져오기
      equipmentDetails = await db.sql`
        SELECT we.id, we.equipmentCount, we.workDetailId, e.equipmentName, e.specification, wd.date, c.company AS companyDetails
        FROM work_equipments we
        JOIN equipments e ON we.equipmentId = e.id
        JOIN work_details wd ON we.workDetailId = wd.id AND wd.date = ${selectedDate}
        JOIN companies c ON wd.companyId = c.id
        ORDER BY we.equipmentId ASC;
      `;

    } catch (error) {
      console.error('Error fetching data:', error);
      throw error; // 추가적인 오류 처리용 throw
    }


    // 데이터 정렬
    workDetails.sort((a, b) => a.companyDetails.company.localeCompare(b.companyDetails.company, 'ko'));
    previousWorkDetails.sort((a, b) => a.companyDetails.company.localeCompare(b.companyDetails.company, 'ko'));

    // 출력 현황 데이터 가공 (manpowerDetails 대체)
    const groupedWorkDetails = allCompanies.map(company => {
      const workDetail = company.workDetails[0];
      return {
        companyDetails: company,
        previousPersonnel: workDetail ? workDetail.personnel_count : 0,
        totalPersonnel: workDetail ? workDetail.personnel_count : 0
      };
    });

    // 누적 자재 및 장비 데이터 처리
    const groupedMaterials = {};
    const groupedEquipments = {};

    materials.forEach(material => {
      const key = `${material.materialDetails.materialName}-${material.materialDetails.specification}`;
      if (!groupedMaterials[key]) {
        groupedMaterials[key] = {
          materialDetails: material,
          inQuantity: 0,
          outQuantity: 0
        };
      }
    });

    equipmentDetails.forEach(equipment => {
      const key = `${equipment.equipment.equipmentName}-${equipment.equipment.specification}`;
      if (!groupedEquipments[key]) groupedEquipments[key] = { equipmentDetails: equipment, equipmentCount: 0 };
    });

    // **변경 사항**: `manpowerDetails` 대신 `groupedWorkDetails` 변수를 전달
    res.render('CombinedFinalPaper', {
      selectedDate,
      siteName,
      weather,
      lowTemp,
      highTemp,
      previousWorkDetails,
      workDetails,
      groupedWorkDetails: groupedWorkDetails, // 정의된 `groupedWorkDetails`를 전달
      groupedMaterials: Object.values(groupedMaterials),
      groupedEquipments: Object.values(groupedEquipments)
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).send('Error fetching data');
  }
});



app.post('/update-personnel-count/:companyId', async (req, res) => {
  const { companyId } = req.params;
  const { personnel_count } = req.body;
  const selectedDate = new Date().toISOString().split('T')[0]; // 현재 날짜 사용

  try {
    // 해당 업체의 해당 날짜의 WorkDetails 레코드를 업데이트하거나 생성합니다.
    let workDetail = await db.sql`
      SELECT * FROM work_details 
      WHERE companyId = ${companyId} AND date = ${selectedDate}
    `;

    if (workDetail.length > 0) {
      // 기존 레코드 업데이트
      await db.sql`
        UPDATE work_details 
        SET personnel_count = ${personnel_count}
        WHERE id = ${workDetail[0].id}
      `;
    } else {
      // 새로운 레코드 생성
      await db.sql`
        INSERT INTO work_details (companyId, date, personnel_count, createdAt)
        VALUES (${companyId}, ${selectedDate}, ${personnel_count}, ${new Date().toISOString()})
      `;
    }

    res.status(200).send('인원 수가 업데이트되었습니다.');
  } catch (error) {
    console.error('인원 수 업데이트 중 오류 발생:', error);
    res.status(500).send('인원 수 업데이트 중 오류가 발생했습니다.');
  }
});





// 서버 실행
app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
