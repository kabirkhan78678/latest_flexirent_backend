import db from "../config/db.js";

export const getBooking = async (booking_id) => {
    return db.query(`SELECT b.*, u.id,u.email,u.first_name,u.last_name,p.* FROM booking_master b JOIN users u ON b.user_id = u.id LEFT JOIN property_master p ON p.property_id = b.property_id WHERE b.booking_id = ?`, [booking_id]);
};

export const updateAllBooking = async (booking_id, date) => {
    return db.query(`UPDATE booking_master SET booking_status = 2 WHERE booking_id = ? AND ? BETWEEN booked_from AND booked_to AND booking_status = 0`, [booking_id, date]);
};

export const getAllBookingOfHost = async (host_ids) => {
    return db.query('SELECT b.* ,p.host_id ,p.category_id,p.property_title,p.property_description,p.floor,p.address,p.latitude,p.longitude,p.post_code,p.bedrooms ,p.bathrooms ,p.beds ,p.square_foot ,p.amenities,p.safety_amenities,p.ideal_for,p.check_in,p.check_out,p.house_rules,p.available_from,p.min_stay_duration ,u.first_name as user_first_name , u.last_name as user_last_name, u.profile_image as user_image ,u.created_at as user_created_at , c.category_name , c.image as category_image , c.description as category_description FROM booking_master b LEFT JOIN property_master p ON p.property_id = b.property_id LEFT  JOIN users u ON u.id = b.user_id LEFT JOIN accommodation_category_master c ON c.category_id = p.category_id WHERE b.host_id IN (?)  ORDER BY b.created_at DESC', [host_ids]);
}

export const getTotalListingsCount = async (host_id) => {
    return db.query('SELECT COALESCE(COUNT(*), 0) as total_listing FROM property_master WHERE host_id = ? AND status = 1', [host_id]);
}

export const getHostListingCount = async (host_id) => {
    return db.query(
        'SELECT COALESCE(COUNT(*), 0) as total_listing FROM property_master WHERE host_id = ? AND delete_flag = 0',
        [host_id]
    );
};

export const getActiveSubscriptionByHostId = async (host_id) => {
    return db.query(
        `SELECT us.*, sm.plan_key, sm.plan_name, sm.max_listings
         FROM user_subscription us
         JOIN subscription_master sm ON sm.subscription_id = us.subscription_id
         WHERE us.host_id = ?
           AND us.is_deleted = 0
           AND us.status = 'active'
           AND (us.end_date IS NULL OR us.end_date >= CURRENT_DATE)
         ORDER BY us.created_at DESC
         LIMIT 1`,
        [host_id]
    );
};

export const getSubscriptionPlanById = async (subscription_id) => {
    return db.query(
        `SELECT * FROM subscription_master
         WHERE subscription_id = ? AND is_deleted = 0 AND is_active = 1`,
        [subscription_id]
    );
};

export const getSubscriptionBySessionId = async (session_id) => {
    return db.query(
        `SELECT * FROM user_subscription WHERE stripe_session_id = ? LIMIT 1`,
        [session_id]
    );
};

export const expireActiveSubscriptions = async (host_id) => {
    return db.query(
        `UPDATE user_subscription
         SET status = 'expired', updated_at = CURRENT_TIMESTAMP
         WHERE host_id = ? AND status = 'active' AND is_deleted = 0`,
        [host_id]
    );
};

export const getHostDashboardCounts = async (host_ids) => {
    return db.query(
        `SELECT
            (SELECT COUNT(*) FROM property_master WHERE host_id IN (?) AND list_status = 1 AND status = 1 AND delete_flag = 0) AS total_properties,
            (SELECT COUNT(*) FROM booking_master WHERE host_id IN (?)) AS total_bookings,
            (SELECT COALESCE(SUM(pm.total_amount), 0) 
             FROM booking_master b
             LEFT JOIN payment_master pm ON pm.booking_id = b.booking_id
             WHERE b.host_id IN (?) AND pm.payment_status = 'COMPLETED') AS total_revenue,
            (SELECT COUNT(*) FROM property_master WHERE host_id IN (?) AND list_type = 1 AND list_status = 0 AND delete_flag = 0) AS pending_listings
         `,
        [host_ids, host_ids, host_ids, host_ids]
    );
};

export const getHostRecentBookings = async (host_ids) => {
    return db.query(
        `SELECT
            b.booking_id,
            b.booked_from,
            b.booked_to,
            b.booking_status,
            b.created_at,
            p.property_id,
            p.property_title,
            u.id AS guest_id,
            u.first_name AS guest_first_name,
            u.last_name AS guest_last_name
        FROM booking_master b
        LEFT JOIN property_master p ON p.property_id = b.property_id
        LEFT JOIN users u ON u.id = b.user_id
        WHERE b.host_id IN (?)
        ORDER BY b.created_at DESC
        LIMIT 5`,
        [host_ids]
    );
};

// export const getHostReviews = async (host_ids, search, rating) => {
//     let where = `WHERE p.host_id IN (?)`;
//     const params = [host_ids];

//     if (search) {
//         where += ` AND (
//             (CASE WHEN COALESCE(r.is_admin_created::text, '') IN ('1', 'true', 't') THEN r.first_name ELSE u.first_name END) LIKE ?
//             OR (CASE WHEN COALESCE(r.is_admin_created::text, '') IN ('1', 'true', 't') THEN r.last_name ELSE u.last_name END) LIKE ?
//             OR u.email LIKE ?
//         )`;
//         const like = `%${search}%`;
//         params.push(like, like, like);
//     }

//     if (rating) {
//         where += ` AND r.rating = ?`;
//         params.push(rating);
//     }


//     return db.query(
//         `SELECT
//             r.rating_id,
//             r.rating,
//             r.review,
//             r.created_at,
//             u.id AS guest_id,
//             CASE WHEN COALESCE(r.is_admin_created::text, '') IN ('1', 'true', 't') THEN r.first_name ELSE u.first_name END AS guest_first_name,
//             CASE WHEN COALESCE(r.is_admin_created::text, '') IN ('1', 'true', 't') THEN r.last_name ELSE u.last_name END AS guest_last_name,
//             u.email AS guest_email,
//             p.property_id,
//             p.property_title
//          FROM rating_master r
//          JOIN property_master p ON p.property_id = r.property_id
//          LEFT JOIN users u ON u.id = r.user_id
//          ${where}
//          ORDER BY r.created_at DESC`,
//         params
//     );
// };

export const getHostReviews = async (host_ids, search, rating) => {
    let where = `WHERE p.host_id IN (?)`;
    const params = [host_ids];

    if (search) {
        where += ` AND (
      (CASE 
          WHEN COALESCE(r.is_admin_created, 0) = 1 
          THEN r.first_name 
          ELSE u.first_name 
       END) LIKE ?
      OR
      (CASE 
          WHEN COALESCE(r.is_admin_created, 0) = 1 
          THEN r.last_name 
          ELSE u.last_name 
       END) LIKE ?
      OR u.email LIKE ?
    )`;

        const like = `%${search}%`;
        params.push(like, like, like);
    }

    if (rating) {
        where += ` AND r.rating = ?`;
        params.push(rating);
    }

    return db.query(
        `SELECT
        r.rating_id,
        r.rating,
        r.review,
        r.created_at,
        u.id AS guest_id,
        CASE 
            WHEN COALESCE(r.is_admin_created, 0) = 1 
            THEN r.first_name 
            ELSE u.first_name 
        END AS guest_first_name,
        CASE 
            WHEN COALESCE(r.is_admin_created, 0) = 1 
            THEN r.last_name 
            ELSE u.last_name 
        END AS guest_last_name,
        u.email AS guest_email,
        p.property_id,
        p.property_title
     FROM rating_master r
     JOIN property_master p 
        ON p.property_id = r.property_id
     LEFT JOIN users u 
        ON u.id = r.user_id
     ${where}
     ORDER BY r.created_at DESC`,
        params
    );
};

export const getHostReviewsCount = async (host_ids, search, rating) => {
    let where = `WHERE p.host_id IN (?)`;
    const params = [host_ids];

    if (search) {
        where += ` AND (
            (CASE WHEN COALESCE(r.is_admin_created::text, '') IN ('1', 'true', 't') THEN r.first_name ELSE u.first_name END) LIKE ?
            OR (CASE WHEN COALESCE(r.is_admin_created::text, '') IN ('1', 'true', 't') THEN r.last_name ELSE u.last_name END) LIKE ?
            OR u.email LIKE ?
        )`;
        const like = `%${search}%`;
        params.push(like, like, like);
    }

    if (rating) {
        where += ` AND r.rating = ?`;
        params.push(rating);
    }

    return db.query(
        `SELECT COUNT(*) AS total
         FROM rating_master r
         JOIN property_master p ON p.property_id = r.property_id
         LEFT JOIN users u ON u.id = r.user_id
         ${where}`,
        params
    );
};

export const getUserByActToken = async (act_token) => {
    return db.query(`SELECT * FROM host_master WHERE act_token = ?`, [act_token])
}

export const getAllAccoumodationCategory = async () => {
    return db.query("SELECT * FROM accommodation_category_master ")
}

export const getAllSafety = async () => {
    return db.query("SELECT * FROM safety_amenities_master ")
}

export const getAmenitits = async () => {
    return db.query(`
    SELECT 
      am.*,
      (
        SELECT COUNT(*)
        FROM property_master psa
        WHERE psa.list_status = 1
          AND psa.status = 1
          AND psa.delete_flag = 0
          AND FIND_IN_SET(am.amenities_id, psa.amenities)
      ) AS property_count
    FROM amenities_master am
  `);
};

export const getIdealFor = async () => {
    return db.query("SELECT * FROM ideal_master ")
}

export const getAllMyProperty = async (host_ids) => {
    return db.query(`SELECT p.* ,  c.category_name FROM property_master p JOIN host_master h ON p.host_id = h.host_id LEFT JOIN accommodation_category_master c ON c.category_id = p.category_id WHERE p.host_id IN (?) AND p.delete_flag = 0 ORDER BY p.created_at desc`, [host_ids]);
};

export const getAllPropertySafety = async (ids) => {
    return db.query("SELECT * FROM safety_amenities_master WHERE safety_id IN (?)", [ids])
}

export const getPropertyAmenitits = async (ids) => {
    return db.query("SELECT * FROM amenities_master WHERE amenities_id IN (?)", [ids])
}
export const getPropertyIdealFor = async (ids) => {
    return db.query("SELECT * FROM ideal_master WHERE ideal_id IN (?)", [ids])
}

export const getKycDoc = async (user_id) => {
    return db.query('SELECT *,CASE status WHEN 0 THEN "Pending" WHEN 1 THEN "Approved" WHEN 2 THEN "Rejected" END AS status_label  FROM document_master WHERE id = ? AND user_type = 2 ORDER BY created_at DESC', [user_id]);
}

export const getHouseRulesByIds = async (ids) => {
    return db.query("SELECT * FROM house_rules_master WHERE house_rules_id IN (?)", [ids])
}


export const getBookingByIdOfHost = async (booking_id) => {
    return db.query('SELECT b.* ,p.host_id ,p.category_id,p.property_title,p.property_description,p.floor,p.address,p.latitude,p.longitude,p.post_code,p.bedrooms ,p.bathrooms ,p.beds ,p.square_foot ,p.amenities,p.safety_amenities,p.ideal_for,p.check_in,p.check_out,p.house_rules,p.available_from,p.min_stay_duration ,u.first_name as user_first_name , u.last_name as user_last_name, u.profile_image as user_image ,u.created_at as user_created_at , c.category_name , c.image as category_image , c.description as category_description FROM booking_master b LEFT JOIN property_master p ON p.property_id = b.property_id LEFT  JOIN users u ON u.id = b.user_id LEFT JOIN accommodation_category_master c ON c.category_id = p.category_id WHERE b.booking_id  = ?  ORDER BY b.created_at DESC', [booking_id]);
}

export const getSupportTicketModel = async (ids) => {
    return db.query('SELECT s.* FROM support_ticket_master s  WHERE s.id IN (?) AND s.user_type = 2 ORDER BY s.created_at DESC', [ids]);
}

export const getSupportQueryModel = async (ids) => {
    return db.query('SELECT s.*,p.property_title,h.first_name as user_first_name , h.last_name as user_last_name FROM support_ticket_master s LEFT JOIN property_master p ON p.property_id = s.property_id LEFT JOIN users h ON h.id = s.id WHERE s.host_id IN (?) AND s.user_type = 1 ORDER BY s.created_at DESC', [ids]);
}

export const getSupportQueryByidModel = async (ticket_id) => {
    return db.query('SELECT s.*,p.property_title,h.first_name as user_first_name , h.last_name as user_last_name FROM support_ticket_master s LEFT JOIN property_master p ON p.property_id = s.property_id LEFT JOIN users h ON h.id = s.id WHERE s.ticket_id = ? AND s.user_type = 1 ORDER BY s.created_at DESC', [ticket_id]);
}

export const getTodaysCheckOutListSchema = async (host_ids) => {
    return db.query(
        `
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
      u.first_name AS user_first_name,
      u.last_name AS user_last_name,
      u.profile_image AS user_image,
      u.created_at AS user_created_at,
      c.category_name,
      c.image AS category_image,
      c.description AS category_description,
      b.check_out_status
    FROM booking_master b
    LEFT JOIN property_master p 
      ON p.property_id = b.property_id
    LEFT JOIN users u 
      ON u.id = b.user_id
    LEFT JOIN accommodation_category_master c 
      ON c.category_id = p.category_id
    WHERE b.host_id IN (?)
    AND b.booking_status = 1 AND b.payment_status = 1
      AND DATE(b.booked_to) = CURRENT_DATE
    ORDER BY b.created_at DESC
    `,
        [host_ids]
    );
};

export const getCleaningProperty = async (host_ids) => {
    return db.query(`SELECT p.* ,  c.category_name FROM property_master p JOIN host_master h ON p.host_id = h.host_id LEFT JOIN accommodation_category_master c ON c.category_id = p.category_id WHERE p.host_id IN (?) AND p.delete_flag = 0 AND p.cleaning_status != 'READY' ORDER BY p.host_id desc`, [host_ids]);
};

export const getAllSubHostByHostId = async (id) => {
    return db.query('SELECT * FROM host_master WHERE added_by = ? ORDER BY created_at DESC', [id]);
}

export const getSubHostIdsByHostId = async (id) => {
    const rows = await db.query(
        'SELECT host_id FROM host_master WHERE added_by = ? ORDER BY created_at DESC',
        [id]
    );
    return rows.map(row => row.host_id);
};


export const getMyReportsModel = async (host_ids) => {
    return db.query('SELECT r.*,u.first_name as user_first_name , u.last_name as user_last_name ,u.profile_image as user_profile_image ,p.property_title FROM report_master r LEFT JOIN users u ON r.user_id = u.id JOIN property_master p ON p.property_id = r.property_id WHERE p.host_id IN (?) ORDER BY r.created_at DESC', [host_ids]);
}

// export const fetchallPropertyInquiriesModel = async (host_id) => {
//     const query = `
//       SELECT 
//         i.inquiry_id,
//         i.message,
//         i.created_at,
//         i.email,
//         u.first_name,
//         u.last_name,
//         p.property_title
//       FROM inquiry_master i
//       LEFT JOIN users u ON i.user_id = u.id
//       LEFT JOIN property_master p ON i.property_id = p.property_id
//       WHERE i.host_id = ?
//       ORDER BY i.created_at DESC
//     `;
//     const rows = await db.query(query, [host_id]);
//     return rows;
// };


// export const fetchallPropertyInquiriesModel = async (host_id) => {
//     const query = `
//     SELECT 
//       i.inquiry_id,
//       i.message,
//       i.created_at,
//       i.email,

//       -- Handle Guest / Deleted User
//       CASE 
//         WHEN i.user_id = 0 OR u.id IS NULL 
//         THEN i.name
//         ELSE i.name
//       END AS user_name,

//       p.property_title

//     FROM inquiry_master i
//     LEFT JOIN users u ON i.user_id = u.id
//     LEFT JOIN property_master p ON i.property_id = p.property_id
//     WHERE i.host_id = ?
//     ORDER BY i.created_at DESC
//   `;

//     const rows = await db.query(query, [host_id]);
//     return rows;
// };

export const fetchallPropertyInquiriesModel = async (host_id) => {
    const query = `
    SELECT 
      i.inquiry_id,
      i.message,
      i.created_at,
      i.email,
      COALESCE(i.name, u.first_name) AS user_name,
      p.property_title
    FROM inquiry_master i
    LEFT JOIN users u 
      ON i.user_id = u.id
    LEFT JOIN property_master p 
      ON i.property_id = p.property_id
    WHERE i.host_id = ?
    ORDER BY i.created_at DESC
  `;

    return db.query(query, [host_id]);
};

export const createPropertyOfferMasterModel = async (values) => {
    if (!values || values.length === 0) {
        return { affectedRows: 0, changedRows: 0, rows: [] };
    }

    const hostId = values[0][1];
    const propertyIds = values.map((row) => row[0]);

    await db.query(
        `
        UPDATE property_offer_master
        SET is_active = 0, updated_at = NOW()
        WHERE host_id = ?
          AND property_id IN (?)
          AND end_date >= CURRENT_DATE
      `,
        [hostId, propertyIds]
    );

    const placeholders = values
        .map((row) => `(${row.map(() => "?").join(", ")})`)
        .join(", ");

    const query = `
         INSERT INTO property_offer_master
         (property_id, host_id, offer_type, offer_value, start_date, end_date)
         VALUES ${placeholders}
       `;

    const result = await db.query(query, values.flat());
    return result;
}

export const fetchOfferPropertyListModel = async (host_id) => {
    const query = `
    SELECT 
     p.*,
      o.offer_id,
      o.offer_type,
      o.offer_value,
      o.start_date,
      o.end_date,
      o.is_active
    FROM property_offer_master o
    INNER JOIN property_master p 
      ON o.property_id = p.property_id
    WHERE o.host_id = ? AND p.delete_flag = 0
    ORDER BY o.created_at DESC
  `;

    const rows = await db.query(query, [host_id]);
    return rows;
};

export const updateOfferIsActiveModel = async (offer_id, host_id, is_active) => {
    console.log('offer_id, host_id, is_active', offer_id, host_id, is_active);

    const query = `
    UPDATE property_offer_master
    SET is_active = ?, updated_at = NOW()
    WHERE offer_id = ? AND host_id = ?
  `;

    const result = await db.query(query, [is_active, offer_id, host_id]);
    return result;
};

export const updatePropertyOfferModel = async (
    offer_id,
    host_id,
    offer_type,
    offer_value,
    start_date,
    end_date
) => {
    const query = `
    UPDATE property_offer_master
    SET 
      offer_type = ?,
      offer_value = ?,
      start_date = ?,
      end_date = ?,
      is_active = 1,
      updated_at = NOW()
    WHERE offer_id = ? AND host_id = ?
  `;

    const result = await db.query(query, [
        offer_type,
        offer_value,
        start_date,
        end_date,
        offer_id,
        host_id
    ]);

    return result;
};

export const getHostPropertiesWithoutOffer = async (host_id) => {
    const query = `
    SELECT 
        p.property_id,
        p.property_title
    FROM property_master p
    LEFT JOIN property_offer_master o
        ON p.property_id = o.property_id
        AND p.host_id = o.host_id
        AND o.end_date >= CURRENT_DATE
    WHERE p.host_id = ?
      AND p.delete_flag = 0
      AND o.property_id IS NULL
  `;

    return db.query(query, [host_id]);
};


export const getHostNotifications = async (host_id) => {
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
      AND receiver_type = 'host'
      AND is_deleted = 0
    ORDER BY notification_id DESC
  `;

    return db.query(query, [host_id]);
};
