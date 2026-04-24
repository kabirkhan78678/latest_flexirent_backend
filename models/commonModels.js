import db from "../config/db.js";

export const getAllDataFromTable = async (Table) => {
    return db.query(`SELECT * FROM ${Table}`);
};

export const getDataByLabel = async (Table, Label, Value) => {
    if (Value === undefined || Value === null) return [];
    return db.query(`SELECT * FROM ${Table} WHERE ${Label} = ?`, [Value]);
};

// export const addDataIntoTable = async (Table, Data) => {
//     const columns = Object.keys(Data);
//     const values = Object.values(Data);
//     const placeholders = columns.map(() => "?").join(", ");
//     const quotedColumns = columns.map((column) => `"${column}"`).join(", ");

//     return db.query(
//         `INSERT INTO ${Table} (${quotedColumns}) VALUES (${placeholders})`,
//         values
//     );
// };

export const addDataIntoTable = async (Table, Data) => {
  const columns = Object.keys(Data);
  const values = Object.values(Data);

  const placeholders = columns.map(() => "?").join(", ");

  const quotedColumns = columns
    .map((column) => `\`${column}\``)
    .join(", ");

  return db.query(
    `INSERT INTO \`${Table}\` (${quotedColumns}) VALUES (${placeholders})`,
    values
  );
};

export const updateDataByLabel = async (Table, Data, Label, Value) => {
  const columns = Object.keys(Data);
  const values = Object.values(Data);

  const setClause = columns
    .map((column) => `\`${column}\` = ?`)
    .join(", ");

  return db.query(
    `UPDATE \`${Table}\` SET ${setClause} WHERE \`${Label}\` = ?`,
    [...values, Value]
  );
};

export const deleteDataByLable = async (Table, Label, Value) => {
    return db.query(`DELETE FROM ${Table} WHERE ${Label} = ?`, [Value]);
};

export const hardDeleteNotificationsByReceiver = async (
    receiver_id,
    receiver_type,
    notification_id = null
) => {
    if (!receiver_id || !receiver_type) {
        return { affectedRows: 0, changedRows: 0, rows: [] };
    }

    const hasNotificationId =
        notification_id !== undefined &&
        notification_id !== null &&
        notification_id !== "";

    const query = hasNotificationId
        ? `
            DELETE FROM notifications
            WHERE receiver_id = ?
              AND receiver_type = ?
              AND notification_id = ?
        `
        : `
            DELETE FROM notifications
            WHERE receiver_id = ?
              AND receiver_type = ?
        `;

    const params = hasNotificationId
        ? [receiver_id, receiver_type, notification_id]
        : [receiver_id, receiver_type];

    return db.query(query, params);
};

export const getAllDocumentName = async () => {
    return db.query("SELECT * FROM doc_name_master ")
}

export const getAllHouseRules = async () => {
    return db.query("SELECT * FROM house_rules_master ")
}

export const getBedsPropertyCount = async () => {
    return db.query(`SELECT
    SUM(CASE WHEN (p.beds = 1 OR p.bathrooms = 1) THEN 1 ELSE 0 END) AS "1",
    SUM(CASE WHEN (p.beds = 2 OR p.bathrooms = 2) THEN 1 ELSE 0 END) AS "2",
    SUM(CASE WHEN (p.beds = 3 OR p.bathrooms = 3) THEN 1 ELSE 0 END) AS "3",
    SUM(CASE WHEN (p.beds = 4 OR p.bathrooms = 4) THEN 1 ELSE 0 END) AS "4",
    SUM(CASE WHEN (p.beds > 4 OR p.bathrooms > 4) THEN 1 ELSE 0 END) AS "4+"
FROM property_master p
WHERE p.list_status = 1 
  AND p.status = 1 
  AND p.delete_flag = 0`);
}

export const getBHKPropertyCount = async () => {
    return db.query(`SELECT
    SUM(CASE WHEN p.bedrooms = 1 THEN 1 ELSE 0 END) AS "1",
    SUM(CASE WHEN p.bedrooms = 2 THEN 1 ELSE 0 END) AS "2",
    SUM(CASE WHEN p.bedrooms = 3 THEN 1 ELSE 0 END) AS "3",
    SUM(CASE WHEN p.bedrooms = 4 THEN 1 ELSE 0 END) AS "4",
    SUM(CASE WHEN p.bedrooms > 4 THEN 1 ELSE 0 END) AS "4+"
FROM property_master p
WHERE p.list_status = 1
  AND p.status = 1
  AND p.delete_flag = 0`);
}

export const getContactus = async () => {
    return db.query(`SELECT * FROM contact_us_master ORDER BY created_at DESC`);
}

export const getAllDataFromTableInDesc = async (Table) => {
    return db.query(`SELECT * FROM ${Table} ORDER BY created_at DESC`);
};

export const getPlatformFeeModel = async () => {
  return db.query(`
    SELECT *
    FROM admin_fee_master
    WHERE is_deleted = 0
    LIMIT 1
  `);
};


export const updatePlatformFeeModel = async (data) => {
  const columns = Object.keys(data);
  const values = Object.values(data);
  const setClause = columns.map((column) => `"${column}" = ?`).join(", ");

  return db.query(
    `
    UPDATE admin_fee_master
    SET ${setClause}
    WHERE is_deleted = 0
    `,
    values
  );
};

export const getGuestReviewModel = async () => {
  return db.query(`
    SELECT r.rating_id ,r.user_id ,r.review ,r.rating ,r.created_at,u.first_name,u.last_name,u.profile_image
    FROM rating_master r JOIN users u ON r.user_id = u.id
    ORDER BY r.created_at DESC
  `);
}
