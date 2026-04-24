import db from "../config/db.js";

export const getProperty = async () => {
    return db.query(`SELECT p.* , h.first_name as host_first_name, h.last_name as host_lost_name, c.category_name FROM property_master p JOIN host_master h ON p.host_id = h.host_id LEFT JOIN accommodation_category_master c ON c.category_id = p.category_id WHERE p.list_status = 1 AND p.status = 1  AND p.delete_flag = 0 ORDER BY p.host_id desc`);
};

export const getHostRating = async (host_id) => {
    return db.query(
        `SELECT
        ROUND(COALESCE(AVG(CAST(r.rating AS DECIMAL(10,2))), 0), 2) AS average_rating,
        COUNT(r.rating_id) AS rating_count
     FROM rating_master r
     JOIN property_master p ON p.property_id = r.property_id
     WHERE p.host_id = ?`,
        [host_id]
    );
};

// -----------------------OLD CODE------------------------------------

// export const getPropertyFilter = async (sort_by, amenties, min_price, max_price, bed_bath, bhk, location, max_person) => {
//     let sql = `SELECT p.* , h.first_name as host_first_name, h.last_name as host_lost_name, c.category_name FROM property_master p JOIN host_master h ON p.host_id = h.host_id LEFT JOIN accommodation_category_master c ON c.category_id = p.category_id WHERE p.list_status = 1 AND p.status = 1 AND p.delete_flag = 0 `;
//     let params = [];
//     if (amenties && amenties.length > 0) {
//         const conditions = amenties.split(",").map(() => `p.amenities LIKE ?`).join(" OR ");
//         sql += ` AND (${conditions})`;
//         params.push(...amenties.split(",").map(item => `%${item}%`));
//     }
//     if (min_price && max_price) {
//         sql += ` AND p.monthly_rent BETWEEN ${min_price} AND ${max_price}`
//     }
//     if (bed_bath && bed_bath.length > 0) {
//         // Ensure bed_bath is always an array of numbers
//         const bedBathArray = Array.isArray(bed_bath)
//             ? bed_bath.map(v => parseInt(v, 10))
//             : bed_bath.split(",").map(v => parseInt(v.trim(), 10));

//         const normalValues = bedBathArray.filter(v => v <= 4);   // collect 1,2,3
//         const hasGreaterThanEqual4 = bedBathArray.some(v => v > 4); // check if 4 or more exists

//         let conditions = [];

//         if (normalValues.length > 0) {
//             conditions.push(`(p.beds IN (${normalValues.join(",")}) OR p.bathrooms IN (${normalValues.join(",")}))`);
//         }

//         if (hasGreaterThanEqual4) {
//             conditions.push(`(p.beds > 4 OR p.bathrooms > 4)`);
//         }

//         if (conditions.length > 0) {
//             sql += ` AND (${conditions.join(" OR ")}) `;
//         }
//     }

//     if (bhk && bhk.length > 0) {
//         // Ensure bhk is always an array of numbers
//         const bhkArray = Array.isArray(bhk)
//             ? bhk.map(v => parseInt(v, 10))
//             : bhk.split(",").map(v => parseInt(v.trim(), 10));

//         const normalValues = bhkArray.filter(v => v <= 4);   // collect 1,2,3
//         const hasGreaterThanEqual4 = bhkArray.some(v => v > 4); // check if 4 or more exists

//         let conditions = [];

//         if (normalValues.length > 0) {
//             conditions.push(`p.bedrooms IN (${normalValues.join(",")})`);
//         }

//         if (hasGreaterThanEqual4) {
//             conditions.push(`p.bedrooms > 4`);
//         }

//         if (conditions.length > 0) {
//             sql += ` AND (${conditions.join(" OR ")}) `;
//         }
//     }



//     if (location && location.length > 0) {
//         sql += ` AND p.address LIKE '%${location}%' `;
//     }

//     if (max_person && max_person.length > 0) {
//         sql += ` AND p.max_person >= ${max_person} `;
//     }

//     if (sort_by && sort_by.length > 0) {
//         if (sort_by == 1) {
//             sql += ` ORDER BY p.created_at ASC`;
//         } else {
//             sql += ` ORDER BY p.created_at DESC`;
//         }
//     }

//     return db.query(sql, params);
// };

// -----------NEW CODE FOR VIEWPORT FILTERING-----------------
export const getPropertyFilter = async (
    sort_by,
    amenties,
    min_price,
    max_price,
    bed_bath,
    bhk,
    location,
    max_person,
    sw_lat,
    sw_lng,
    ne_lat,
    ne_lng
) => {

    let sql = `
    SELECT 
      p.*,
      h.first_name AS host_first_name,
      h.last_name AS host_last_name,
      c.category_name
    FROM property_master p
    JOIN host_master h ON p.host_id = h.host_id
    LEFT JOIN accommodation_category_master c 
      ON c.category_id = p.category_id
    WHERE p.list_status = 1
      AND p.status = 1
      AND p.delete_flag = 0
  `;

    let params = [];

    /* ---------------- AMENITIES ---------------- */
    if (amenties && amenties.length > 0) {
        const conditions = amenties
            .split(",")
            .map(() => `p.amenities LIKE ?`)
            .join(" OR ");

        sql += ` AND (${conditions})`;
        params.push(...amenties.split(",").map(i => `%${i}%`));
    }

    /* ---------------- PRICE ---------------- */
    if (min_price && max_price) {
        sql += ` AND p.monthly_rent BETWEEN ? AND ?`;
        params.push(min_price, max_price);
    }

    /* ---------------- BED / BATH ---------------- */
    if (bed_bath && bed_bath.length > 0) {
        const arr = Array.isArray(bed_bath)
            ? bed_bath.map(Number)
            : bed_bath.split(",").map(v => parseInt(v.trim(), 10));

        const normal = arr.filter(v => v <= 4);
        const has4Plus = arr.some(v => v > 4);

        let conditions = [];

        if (normal.length > 0) {
            conditions.push(
                `(p.beds IN (${normal.join(",")}) OR p.bathrooms IN (${normal.join(",")}))`
            );
        }

        if (has4Plus) {
            conditions.push(`(p.beds > 4 OR p.bathrooms > 4)`);
        }

        if (conditions.length) {
            sql += ` AND (${conditions.join(" OR ")})`;
        }
    }

    /* ---------------- BHK ---------------- */
    if (bhk && bhk.length > 0) {
        const arr = Array.isArray(bhk)
            ? bhk.map(Number)
            : bhk.split(",").map(v => parseInt(v.trim(), 10));

        const normal = arr.filter(v => v <= 4);
        const has4Plus = arr.some(v => v > 4);

        let conditions = [];

        if (normal.length > 0) {
            conditions.push(`p.bedrooms IN (${normal.join(",")})`);
        }

        if (has4Plus) {
            conditions.push(`p.bedrooms > 4`);
        }

        if (conditions.length) {
            sql += ` AND (${conditions.join(" OR ")})`;
        }
    }

    /* ================= 🔥 VIEWPORT SEARCH (TOP PRIORITY) 🔥 ================= */
    if (sw_lat && sw_lng && ne_lat && ne_lng) {
        sql += `
      AND p.latitude BETWEEN ? AND ?
      AND p.longitude BETWEEN ? AND ?
    `;
        params.push(
            parseFloat(sw_lat),
            parseFloat(ne_lat),
            parseFloat(sw_lng),
            parseFloat(ne_lng)
        );
    }

    /* ================= TEXT LOCATION (FALLBACK) ================= */
    else if (location && location.trim() !== "") {
        sql += `
      AND (
        p.address LIKE ?
        OR p.location LIKE ?
        OR p.state LIKE ?
        OR p.country LIKE ?
      )
    `;
        const search = `%${location}%`;
        params.push(search, search, search, search);
    }

    /* ---------------- MAX PERSON ---------------- */
    if (max_person) {
        sql += ` AND p.max_person >= ?`;
        params.push(max_person);
    }

    /* ---------------- SORT ---------------- */
    if (sort_by) {
        sql += sort_by == 1
            ? ` ORDER BY p.created_at ASC`
            : ` ORDER BY p.created_at DESC`;
    }

    return db.query(sql, params);
};


export const getPropertyById = async (property_id) => {
    return db.query(`SELECT p.* , h.first_name as host_first_name, h.last_name as host_lost_name, c.category_name FROM property_master p JOIN host_master h ON p.host_id = h.host_id LEFT JOIN accommodation_category_master c ON c.category_id = p.category_id WHERE p.list_status = 1 AND p.status = 1 AND p.property_id = ? ORDER BY p.host_id desc`, [property_id]);
};

export const checkPropertyBooking = async (property_id) => {
    return db.query(
        `SELECT 
        b.booked_from,
        b.booked_to,
        p.start_date,
        p.end_date
     FROM booking_master b
     LEFT JOIN payment_master p 
        ON p.booking_id = b.booking_id
     WHERE b.property_id = ?
       AND COALESCE(b.booking_status, 0) = 1
       AND p.payment_status = 'COMPLETED'`,
        [property_id]
    );
};

export const getAdminEarnings = async (user_type) => {
    return db.query('SELECT fee_type ,commission FROM fee_master WHERE user_type = ?', [user_type]);
}

export const getAllBookingOfUser = async (user_id) => {
    return db.query('SELECT b.* ,p.host_id ,p.category_id,p.property_title,p.property_description,p.floor,p.address,p.latitude,p.longitude,p.post_code,p.bedrooms ,p.bathrooms ,p.beds ,p.square_foot ,p.amenities,p.safety_amenities,p.ideal_for,p.check_in,p.check_out,p.house_rules,p.available_from,p.min_stay_duration ,u.first_name as host_first_name , u.last_name as host_last_name, u.profile_image as host_image ,u.created_at as host_created_at,u.about as host_about,u.email as host_email,u.owner_type as host_owner_type , c.category_name , c.image as category_image , c.description as category_description FROM booking_master b LEFT JOIN property_master p ON p.property_id = b.property_id LEFT  JOIN host_master u ON u.host_id = p.host_id LEFT JOIN accommodation_category_master c ON c.category_id = p.category_id WHERE b.user_id = ? ORDER BY b.created_at DESC', [user_id]);
}


export const getUserByAct_Token = async (act_token) => {
    return db.query(`SELECT * FROM users WHERE act_token = ?`, [act_token])
}

export const getBooking = async (booking_id) => {
    return db.query(`SELECT b.*, u.id,u.email,u.first_name,u.last_name,p.* FROM booking_master b JOIN users u ON b.user_id = u.id LEFT JOIN property_master p ON p.property_id = b.property_id WHERE b.booking_id = ?`, [booking_id]);
};

export const getBusnessAllDashboardCount = async (user_id) => {
    return db.query('SELECT    (SELECT COUNT(*) FROM users WHERE user_type = 1 AND added_by = ?) AS total_users,    (SELECT COUNT(*) FROM booking_master WHERE user_id = ?) AS total_bookings,    (SELECT COUNT(*) FROM booking_master b LEFT JOIN users u ON u.id = b.user_id WHERE u.user_type = 1 AND u.added_by = ?) AS total_users_booking', [user_id, user_id, user_id]);
}

export const getGuestDashboardCount = async (user_id) => {
    return db.query(
        `SELECT
            (SELECT COUNT(*) FROM booking_master WHERE user_id = ?) AS total_bookings,
            (SELECT COUNT(*) FROM booking_master WHERE user_id = ? AND booking_status = 1) AS approved_bookings,
            (SELECT COUNT(*) FROM booking_master WHERE user_id = ? AND booking_status = 0) AS pending_bookings,
            (SELECT COUNT(*) FROM booking_master WHERE user_id = ? AND booking_status = 2) AS rejected_bookings
        `,
        [user_id, user_id, user_id, user_id]
    );
};

export const getGuestRecentBookings = async (user_id) => {
    return db.query(
        `SELECT
            b.booking_id,
            b.booked_from,
            b.booked_to,
            b.booking_status,
            b.payment_status,
            b.created_at,
            p.property_id,
            p.property_title,
            h.host_id,
            h.first_name AS host_first_name,
            h.last_name AS host_last_name
        FROM booking_master b
        LEFT JOIN property_master p ON p.property_id = b.property_id
        LEFT JOIN host_master h ON h.host_id = b.host_id
        WHERE b.user_id = ?
        ORDER BY b.created_at DESC
        LIMIT 5`,
        [user_id]
    );
};

export const getKycDoc = async (user_id, user_type = 1) => {
    return db.query('SELECT *,CASE status WHEN 0 THEN "Pending" WHEN 1 THEN "Approved" WHEN 2 THEN "Rejected" END AS status_label  FROM document_master WHERE id = ? AND user_type = ? ORDER BY created_at DESC', [user_id, user_type]);
}

export const getGuestDocumentsByUserType = async (user_id, user_type) => {
    return db.query(
        `SELECT document_id FROM document_master WHERE id = ? AND user_type = ?`,
        [user_id, user_type]
    );
}

export const deleteGuestDocumentsByUserType = async (user_id, user_type) => {
    return db.query(
        `DELETE FROM document_master WHERE id = ? AND user_type = ?`,
        [user_id, user_type]
    );
}

export const bulkInsertGuestDocuments = async (rows) => {
    if (!rows || rows.length === 0) {
        return { affectedRows: 0, changedRows: 0, rows: [] };
    }

    const placeholders = rows
        .map((row) => `(${row.map(() => "?").join(", ")})`)
        .join(", ");
    const values = rows.flat();

    return db.query(
        `INSERT INTO document_master (id, user_type, title, file, status, rejected_reason) VALUES ${placeholders}`,
        values
    );
}

export const getRecentBookings = async (ids) => {
    return db.query(`SELECT b.*,p.*,u.email as user_email ,u.first_name as user_first_name , u.last_name as user_last_name, u.profile_image as user_image ,u.created_at as user_created_at,h.email as host_email  , h.first_name as host_first_name, h.last_name as host_lost_name, h.profile_image as host_image ,h.created_at as host_created_at,CASE b.booking_status  WHEN 0 THEN "Pending" WHEN 1 THEN "Approved" WHEN 2 THEN "Rejected" END AS booking_status_label FROM booking_master b LEFT JOIN property_master p ON p.property_id = b.property_id LEFT JOIN users u ON u.id = b.user_id LEFT JOIN host_master h ON h.host_id = p.host_id WHERE b.user_id IN (?) ORDER BY b.created_at DESC`, [ids]);
}

export const getBusinessBookingsById = async (id) => {
    return db.query(`SELECT b.*,p.*,u.email as user_email ,u.first_name as user_first_name , u.last_name as user_last_name, u.profile_image as user_image ,u.created_at as user_created_at,h.email as host_email  , h.first_name as host_first_name, h.last_name as host_lost_name, h.profile_image as host_image ,h.created_at as host_created_at,CASE b.booking_status  WHEN 0 THEN "Pending" WHEN 1 THEN "Approved" WHEN 2 THEN "Rejected" END AS booking_status_label FROM booking_master b LEFT JOIN property_master p ON p.property_id = b.property_id LEFT JOIN users u ON u.id = b.user_id LEFT JOIN host_master h ON h.host_id = p.host_id WHERE b.booking_id = ?`, [id]);
}

export const getSubGuest = async (id) => {
    return db.query(
        `SELECT *,
        CASE
            WHEN COALESCE(is_blocked, 0) = 1 THEN 'Blocked'
            ELSE 'Unblocked'
        END AS blocked_status
     FROM users
     WHERE added_by = ?
     ORDER BY created_at DESC`,
        [id]
    );
};

export const getBookingPayments = async (ids) => {
    return db.query(
        `SELECT 
            pm.*,
            b.*,
            b.user_id as booking_user_id,
            p.property_title,
            p.property_description,
            p.monthly_rent,
            u.email as user_email,
            u.first_name as user_first_name,
            u.last_name as user_last_name,
            u.profile_image as user_image,
            u.created_at as user_created_at,
            h.email as host_email,
            h.first_name as host_first_name,
            h.last_name as host_lost_name,
            h.profile_image as host_image,
            h.created_at as host_created_at,
            h.business_name,
            h.address as business_address,
            CASE b.booking_status  
                WHEN 0 THEN "Pending" 
                WHEN 1 THEN "Approved" 
                WHEN 2 THEN "Rejected" 
            END AS booking_status_label
        FROM payment_master pm
        LEFT JOIN booking_master b 
            ON pm.booking_id = b.booking_id
        LEFT JOIN property_master p 
            ON p.property_id = b.property_id
        LEFT JOIN users u 
            ON u.id = b.user_id
        LEFT JOIN host_master h 
            ON h.host_id = p.host_id
        WHERE b.user_id IN (?) 
            AND b.payment_status = 1
        ORDER BY b.created_at`,
        [ids]
    );
};


// export const getBookingPayments = async (ids) => {
//     return db.query(`SELECT pm.*,b.*,b.user_id as booking_user_id,p.property_title,p.property_description,p.monthly_rent,u.email as user_email ,u.first_name as user_first_name , u.last_name as user_last_name, u.profile_image as user_image ,u.created_at as user_created_at,h.email as host_email  , h.first_name as host_first_name, h.last_name as host_lost_name, h.profile_image as host_image ,h.created_at as host_created_at,h.business_name,h.address as business_address,CASE b.booking_status  WHEN 0 THEN "Pending" WHEN 1 THEN "Approved" WHEN 2 THEN "Rejected" END AS booking_status_label FROM payment_master pm LEFT JOIN booking_master b ON pm.booking_id = b.booking_id LEFT JOIN property_master p ON p.property_id = b.property_id LEFT JOIN users u ON u.id = b.user_id LEFT JOIN host_master h ON h.host_id = p.host_id WHERE b.user_id IN (?) AND b.payment_status = 1 ORDER BY b.created_at `, [ids]);
// } 


export const getPropertyReview = async (id) => {
    return db.query(
        `SELECT 
        r.rating_id,
        r.user_id,
        r.property_id,
        r.booking_id,
        r.review,
        r.rating,
        r.created_at,
        CASE 
            WHEN COALESCE(r.is_admin_created, 0) = 1 THEN r.first_name
            ELSE u.first_name
        END AS first_name,
        
        CASE 
            WHEN COALESCE(r.is_admin_created, 0) = 1 THEN r.last_name
            ELSE u.last_name
        END AS last_name,
        
        CASE 
            WHEN COALESCE(r.is_admin_created, 0) = 1 THEN r.profile_image
            ELSE u.profile_image
        END AS profile_image
     FROM rating_master r
     LEFT JOIN users u ON u.id = r.user_id
     WHERE r.property_id = ?
     ORDER BY r.created_at DESC`,
        [id]
    );
};
export const getRecentBookingOfUser = async (user_id) => {
    return db.query('SELECT b.* ,p.host_id ,p.category_id,p.property_title,p.property_description,p.floor,p.address,p.latitude,p.longitude,p.post_code,p.bedrooms ,p.bathrooms ,p.beds ,p.square_foot ,p.amenities,p.safety_amenities,p.ideal_for,p.check_in,p.check_out,p.house_rules,p.available_from,p.min_stay_duration ,u.first_name as host_first_name , u.last_name as host_last_name, u.profile_image as host_image ,u.created_at as host_created_at,u.about as host_about,u.email as host_email,u.owner_type as host_owner_type , c.category_name , c.image as category_image , c.description as category_description FROM booking_master b LEFT JOIN property_master p ON p.property_id = b.property_id LEFT  JOIN host_master u ON u.host_id = p.host_id LEFT JOIN accommodation_category_master c ON c.category_id = p.category_id WHERE b.user_id = ? ORDER BY b.created_at DESC LIMIT 5', [user_id]);
}

export const getSingleBookingOfUser = async (booking_id) => {
    return db.query('SELECT b.* ,p.host_id ,p.category_id,p.property_title,p.property_description,p.floor,p.address,p.latitude,p.longitude,p.post_code,p.bedrooms ,p.bathrooms ,p.beds ,p.square_foot ,p.amenities,p.safety_amenities,p.ideal_for,p.check_in,p.check_out,p.house_rules,p.available_from,p.min_stay_duration ,u.first_name as host_first_name , u.last_name as host_last_name, u.profile_image as host_image ,u.created_at as host_created_at,u.about as host_about,u.email as host_email,u.owner_type as host_owner_type , c.category_name , c.image as category_image , c.description as category_description FROM booking_master b LEFT JOIN property_master p ON p.property_id = b.property_id LEFT  JOIN host_master u ON u.host_id = p.host_id LEFT JOIN accommodation_category_master c ON c.category_id = p.category_id WHERE b.booking_id = ? ORDER BY b.created_at DESC', [booking_id]);
}


export const getSupportTicketModel = async (id) => {
    return db.query('SELECT s.*,p.property_title,h.first_name as host_first_name , h.last_name as host_last_name FROM support_ticket_master s LEFT JOIN property_master p ON p.property_id = s.property_id LEFT JOIN host_master h ON h.host_id = p.host_id WHERE s.id = ? AND s.user_type = 1 ORDER BY s.created_at DESC', [id]);
}

export const getPropertyBYId = async (property_id) => {
    return db.query(`SELECT p.* , h.first_name as host_first_name, h.last_name as host_lost_name, c.category_name FROM property_master p JOIN host_master h ON p.host_id = h.host_id LEFT JOIN accommodation_category_master c ON c.category_id = p.category_id WHERE p.list_status = 1 AND p.status = 1  AND p.delete_flag = 0 AND p.property_id = ? ORDER BY p.host_id desc`, [property_id]);
};

export const getSubGuestsIdsGuestId = async (id) => {
    const rows = await db.query(
        'SELECT id FROM users WHERE added_by = ? ORDER BY created_at DESC',
        [id]
    );
    return rows.map(row => row.id);
};

export const checkBookingPaymentStatus = async (booking_id) => {
    return db.query(`
    SELECT 
      b.*, 
      (
        SELECT p.session_id 
        FROM payment_master p 
        WHERE p.booking_id = b.booking_id 
        ORDER BY p.created_at DESC 
        LIMIT 1
      ) AS session_id,
      (
        SELECT p.transaction_id 
        FROM payment_master p 
        WHERE p.booking_id = b.booking_id 
        ORDER BY p.created_at DESC 
        LIMIT 1
      ) AS transaction_id,
      u.id AS user_id,
      u.email,
      u.first_name,
      u.last_name,
      pm.property_title,
      pm.property_description,
      pm.address,
      h.email as host_email,
      h.first_name as host_first_name,
      h.last_name as host_last_name
    FROM booking_master b
    JOIN users u ON b.user_id = u.id
    LEFT JOIN  host_master h ON h.host_id = b.host_id
    LEFT JOIN property_master pm ON pm.property_id = b.property_id
    WHERE b.booking_id = ?
  `, [booking_id]);
};

export const checkSubGuestBookingCount = async (user_id) => {
    return db.query(`
    SELECT 
  COUNT(b.booking_id) AS booking_count,
  u.number_of_bookings,
  CASE 
    WHEN COUNT(b.booking_id) >= u.number_of_bookings THEN TRUE
    ELSE FALSE
  END AS is_exceeded
FROM booking_master b
LEFT JOIN users u ON u.id = b.user_id
WHERE 
  b.user_id = ?
  AND b.booking_status = 1
  AND DATE_FORMAT(b.created_at, '%Y-%m') = DATE_FORMAT(CURDATE(), '%Y-%m')
GROUP BY u.number_of_bookings
  `, [user_id]);
};


export const getPaymentHistoryBookingBYIdModel = async (booking_id) => {
    return db.query(`
        SELECT 
  b.*,
  p.host_id,
  p.category_id,
  p.property_title,
  p.property_description,
  p.floor,
  p.address,
  p.latitude,
  p.longitude,
  p.post_code,
  p.bedrooms,
  p.bathrooms,
  p.beds,
  p.square_foot,
  p.amenities,
  p.safety_amenities,
  p.ideal_for,
  p.check_in,
  p.check_out,
  p.house_rules,
  p.available_from,
  p.min_stay_duration,
  u.first_name AS host_first_name,
  u.last_name AS host_last_name,
  u.profile_image AS host_image,
  u.created_at AS host_created_at,
  u.about AS host_about,
  u.email AS host_email,
  u.owner_type AS host_owner_type,
  c.category_name,
  c.image AS category_image,
  c.description AS category_description,
  COALESCE(
    (
      SELECT JSON_ARRAYAGG(
        JSON_OBJECT(
          'payment_id', pm.payment_id,
          'transaction_id', pm.transaction_id,
          'payment_status', pm.payment_status,
          'payment_method', pm.payment_method,
          'start_date', pm.start_date,
          'end_date', pm.end_date,
          'number_of_days', pm.number_of_days,
          'security_deposit', pm.security_deposit,
          'total_amount', pm.total_amount,
          'admin_earnings', pm.admin_earnings,
          'host_payout_amount', pm.host_payout_amount,
          'currency', pm.currency,
          'payout_status', COALESCE(pm.payout_status, 'PENDING'),
          'release_on', pm.release_on,
          'payout_released_at', pm.payout_released_at,
          'stripe_transfer_id', pm.stripe_transfer_id,
          'payout_failure_reason', pm.payout_failure_reason,
          'stripe_fee', pm.stripe_fee,
          'net_amount', pm.net_amount,
          'gross_amount', pm.gross_amount,
          'stripe_total_amount', pm.stripe_total_amount,
          'vat_details', pm.vat_details,
          'created_at', pm.created_at
        )
      )
      FROM payment_master pm
      WHERE pm.booking_id = b.booking_id
    ),
    JSON_ARRAY()
  ) AS payment_details
FROM booking_master b
LEFT JOIN property_master p ON p.property_id = b.property_id
LEFT JOIN host_master u ON u.host_id = p.host_id
LEFT JOIN accommodation_category_master c ON c.category_id = p.category_id
WHERE b.booking_id = ?
  AND b.payment_status = 1;
        `, [booking_id]);
}

export const getPaymentHistoryBookingModel = async (user_ids) => {
    return db.query(
        `SELECT 
    b.*,
    p.host_id,
    p.category_id,
    p.property_title,
    p.property_description,
    p.floor,
    p.address,
    p.latitude,
    p.longitude,
    p.post_code,
    p.bedrooms,
    p.bathrooms,
    p.beds,
    p.square_foot,
    p.amenities,
    p.safety_amenities,
    p.ideal_for,
    p.check_in,
    p.check_out,
    p.house_rules,
    p.available_from,
    p.min_stay_duration,
    h.first_name AS host_first_name,
    h.last_name AS host_last_name,
    COALESCE(pm_latest.payout_status, 'PENDING') AS payout_status,
    pm_latest.host_payout_amount,
    pm_latest.admin_earnings,
    pm_latest.release_on,
    pm_latest.payout_released_at,
    pm_latest.stripe_transfer_id

FROM booking_master b
LEFT JOIN property_master p 
    ON p.property_id = b.property_id

LEFT JOIN host_master h 
    ON h.host_id = p.host_id

LEFT JOIN payment_master pm_latest
    ON pm_latest.payment_id = (
      SELECT pm2.payment_id
      FROM payment_master pm2
      WHERE pm2.booking_id = b.booking_id
      ORDER BY pm2.created_at DESC
      LIMIT 1
    )

WHERE b.user_id IN (?)
  AND b.payment_status = 1`, [user_ids]
    )
}

export const cancelBookingModel = async (cancel_reason, booking_id) => {
    return db.query(`UPDATE booking_master SET is_canceled = 'Guest',cancel_reason	= ?,updated_at = NOW() WHERE booking_id = ?`, [cancel_reason, booking_id]);
}

export const getWishlistByUserAndProperty = async (user_id, property_id) => {
    return db.query(
        `SELECT * FROM user_wishlists WHERE user_id = ? AND property_id = ? LIMIT 1`,
        [user_id, property_id]
    );
};

export const addWishlistModel = async (data) => {
    const columns = Object.keys(data);
    const values = Object.values(data);

    const placeholders = columns.map(() => "?").join(", ");

    const quotedColumns = columns
        .map((column) => `\`${column}\``)
        .join(", ");

    return db.query(
        `INSERT INTO \`user_wishlists\` (${quotedColumns}) VALUES (${placeholders})`,
        values
    );
};

export const restoreWishlistModel = async (wishlist_id) => {
    return db.query(
        `UPDATE user_wishlists SET deleted_at = NULL WHERE id = ?`,
        [wishlist_id]
    );
};

export const removeWishlistModel = async (user_id, property_id) => {
    return db.query(
        `UPDATE user_wishlists SET deleted_at = NOW() WHERE user_id = ? AND property_id = ? AND deleted_at IS NULL`,
        [user_id, property_id]
    );
};

export const getWishlistByUser = async (user_id) => {
    return db.query(
        `SELECT 
            w.id AS wishlist_id,
            w.created_at,
            p.*,
            h.first_name AS host_first_name,
            h.last_name AS host_lost_name,
            c.category_name
        FROM user_wishlists w
        JOIN property_master p ON p.property_id = w.property_id
        JOIN host_master h ON p.host_id = h.host_id
        LEFT JOIN accommodation_category_master c ON c.category_id = p.category_id
        WHERE w.user_id = ?
          AND w.deleted_at IS NULL
          AND p.list_status = 1
          AND p.status = 1
          AND p.delete_flag = 0
        ORDER BY w.created_at DESC`,
        [user_id]
    );
};

export const getWishlistPropertyIdsForUser = async (user_id, property_ids) => {
    if (!property_ids || property_ids.length === 0) return [];
    return db.query(
        `SELECT property_id
         FROM user_wishlists
         WHERE user_id = ?
           AND property_id IN (?)
           AND deleted_at IS NULL`,
        [user_id, property_ids]
    );
};

export const getActiveSubscriptionPlans = async () => {
    return db.query(
        `SELECT *
         FROM subscription_master
         WHERE is_deleted = 0 AND is_active = 1
         ORDER BY created_at DESC`
    );
};

export const fetchAllReportsModel = async () => {
    const query = `
      SELECT 
        r.*,
        u.first_name,
        u.last_name,
        p.property_title
      FROM report_master r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN property_master p ON r.property_id = p.property_id
      ORDER BY r.created_at DESC
    `;

    const reports = await db.query(query);
    return reports; // Return the first result (or you can return all if needed)
};


export const getReportDashboardCountModel = async () => {
    const query = `
      SELECT
        COUNT(*) as total_reports,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
      FROM report_master
    `;

    const rows = await db.query(query);
    const reports = rows[0] || {};
    return reports; // Return the first result (or you can return all if needed)
};


export const getReportByIdModel = async (report_id) => {
    const query = `
      SELECT 
        r.*,
        u.first_name,
        u.last_name,
        p.property_title
      FROM report_master r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN property_master p ON r.property_id = p.property_id
      WHERE r.report_id = ?
      ORDER BY r.created_at DESC
    `;

    const reports = await db.query(query, [report_id]);
    return reports; // Return the first result (or you can return all if needed)
};

export const getReportsModel = async (user_id) => {
    return db.query('SELECT r.*,p.property_title FROM report_master r LEFT JOIN property_master p ON p.property_id = r.property_id WHERE r.user_id = ? ORDER BY r.created_at DESC', [user_id]);
}

// ------------------------------new points----------------------------------------------//

export const getPropertyReviewById = async (id) => {
    return db.query(`SELECT * FROM rating_master WHERE property_id = ? ORDER BY created_at DESC;`, [id]);
}

// -----------------------------user inquiry------------------------------

export const createUserInquiryModel = async (data) => {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map(() => "?").join(", ");
    const quotedColumns = columns.map((column) => `"${column}"`).join(", ");

    return db.query(
        `INSERT INTO user_inquiry_master (${quotedColumns}) VALUES (${placeholders})`,
        values
    );
}

export const fetchUserPropertyByPropertyId = async (id) => {
    return db.query("SELECT host_id FROM property_master WHERE property_id = ?", [id]);
}

export const fetchUserInquiryByUserId = async (id) => {
    const query = `
      SELECT 
        i.inquiry_id,
        i.message,
        i.name AS user_name,
        i.created_at,
        p.property_title,
        i.email,
        CONCAT(h.first_name, ' ', h.last_name) AS host_name
      FROM inquiry_master i
      LEFT JOIN property_master p ON i.property_id = p.property_id
      LEFT JOIN host_master h ON p.host_id = h.host_id
      WHERE i.user_id = ?
      ORDER BY i.created_at DESC
    `;
    const rows = await db.query(query, [id]);
    return rows; // Return the first result (or you can return all if needed)
}

export const fetchSeoMasterByPageSlug = async (page_slug) => {
    return db.query("SELECT * FROM seo_management WHERE page_slug = ?", [page_slug]);
}

export const getActiveOfferByPropertyId = async (property_id) => {
    const query = `
    SELECT offer_value, offer_type, start_date, end_date
    FROM property_offer_master
    WHERE property_id = ?
      AND is_active = 1
      AND CURRENT_DATE BETWEEN start_date AND end_date
    ORDER BY created_at DESC, offer_id DESC
    LIMIT 1
  `;

    const rows = await db.query(query, [property_id]);
    return rows[0];
};


export const getUserNotifications = async (user_id) => {
    const query = `
    SELECT 
      notification_id,
      sender_id,
      sender_type,
      title,
      message,
      reference_id,
      reference_type,
      notification_type,
      is_read,
      created_at
    FROM notifications
    WHERE receiver_id = ?
      AND receiver_type = 'user'
      AND is_deleted = 0
    ORDER BY notification_id DESC
  `;

    return db.query(query, [user_id]);
};
