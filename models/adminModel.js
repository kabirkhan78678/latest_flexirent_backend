import db from "../config/db.js";

export const getDataByLabel2 = async (Table, Label, Value, Label1, Value1) => {
    if (Value === undefined || Value === null || Value1 === undefined || Value1 === null) return [];
    return db.query(
        `SELECT * FROM ${Table} WHERE ${Label} = ? AND ${Label1} = ?`,
        [Value, Value1]
    );
};


export const getProperty = async () => {
    return db.query(`SELECT p.* , h.first_name as host_first_name, h.last_name as host_lost_name, c.category_name FROM property_master p JOIN host_master h ON p.host_id = h.host_id LEFT JOIN accommodation_category_master c ON c.category_id = p.category_id WHERE list_status = 1 ORDER BY p.host_id desc`);
};

export const getApprovedPropertyOptionsForReview = async () => {
    return db.query(
        `SELECT property_id, property_title
         FROM property_master
         WHERE  status = 1
           AND delete_flag = 0
         ORDER BY property_title ASC`
    );
};


export const getSubAdminPermission = async (Table, Label, Value, Label1, Value1) => {
    if (Value === undefined || Value === null || Value1 === undefined || Value1 === null) return [];
    return db.query(
        `SELECT * FROM permissions_master WHERE admin_id = ? AND ${Label1} = ?`,
        [Value, Value1]
    );
};

export const getPropertyListing = async () => {
    return db.query(`SELECT p.* , h.first_name as host_first_name, h.last_name as host_lost_name, c.category_name FROM property_master p JOIN host_master h ON p.host_id = h.host_id LEFT JOIN accommodation_category_master c ON c.category_id = p.category_id WHERE list_status = 0 AND list_type = 1 ORDER BY p.host_id desc`);
};

export const getPropertyListingByHostTypes = async (user_types) => {
    return db.query(
        `SELECT p.* , h.first_name as host_first_name, h.last_name as host_lost_name, c.category_name
         FROM property_master p
         JOIN host_master h ON p.host_id = h.host_id
         LEFT JOIN accommodation_category_master c ON c.category_id = p.category_id
         WHERE p.list_status = 0 AND p.list_type = 1 AND h.user_type IN (?)
         ORDER BY p.host_id desc`,
        [user_types]
    );
};

export const getAllSubAdminCount = async () => {
    return db.query('SELECT  COUNT(*) AS total_sub_admin,  COUNT(CASE WHEN is_active = 1 THEN 1 END) AS total_active,  COUNT(CASE WHEN is_active = 0 THEN 1 END) AS total_deactive,  COUNT(CASE WHEN is_pending = 0 THEN 1 END) AS total_pending FROM admin_master WHERE user_type = 2');
}

export const getAllListingRequestCount = async () => {
    return db.query('SELECT  COUNT(*) AS total_listing_request,  COUNT(CASE WHEN list_status  = 0 THEN 1 END) AS total_pending,  COUNT(CASE WHEN list_status  = 1 AND status = 1 THEN 1 END) AS total_approve,  COUNT(CASE WHEN status  = 2 THEN 1 END) AS total_reject FROM property_master WHERE list_type  = 1');
}

export const getAllDashboardCount = async () => {
    return db.query('SELECT    (SELECT COUNT(*) FROM users WHERE user_type = 1) AS total_users,    (SELECT COUNT(*) FROM host_master WHERE user_type = 1) AS total_host,    (SELECT COUNT(*) FROM booking_master) AS total_booking,    (SELECT COUNT(*) FROM property_master) AS total_properties');
}

export const getRecentBooking = async () => {
    return db.query("SELECT b.* ,p.* ,u.first_name as user_first_name , u.last_name as user_last_name,u.email as user_email,h.first_name as host_first_name , h.last_name as host_last_name,h.email as host_email , c.category_name FROM booking_master b LEFT JOIN property_master p ON p.property_id = b.property_id LEFT JOIN users u ON u.id = b.user_id LEFT JOIN host_master h ON h.host_id = b.host_id LEFT JOIN accommodation_category_master c ON c.category_id = p.category_id ORDER BY b.created_at DESC LIMIT 5")
}

export const getAllUsers = async () => {
    return db.query("SELECT * FROM users WHERE user_type = 1 ORDER BY created_at DESC")
}

export const getUserAllBooking = async (user_id) => {
    return db.query("SELECT b.* ,p.* ,u.first_name as user_first_name , u.last_name as user_last_name,u.email as user_email,u.profile_image as user_profile_image,h.first_name as host_first_name , h.last_name as host_last_name,h.email as host_email,h.profile_image as host_profile_image , c.category_name FROM booking_master b LEFT JOIN property_master p ON p.property_id = b.property_id LEFT JOIN users u ON u.id = b.user_id LEFT JOIN host_master h ON h.host_id = b.host_id LEFT JOIN accommodation_category_master c ON c.category_id = p.category_id WHERE user_id = ? ORDER BY b.created_at DESC", [user_id])
}

export const getAllHosts = async () => {
    return db.query("SELECT * FROM host_master WHERE user_type = 1 ORDER BY created_at DESC")
}

export const getAllHostBusiness = async () => {
    return db.query("SELECT * FROM host_master WHERE user_type = 2 ORDER BY created_at DESC")
}

export const getAllHostProperty = async (host_id) => {
    return db.query(`SELECT p.* , h.first_name as host_first_name, h.last_name as host_lost_name, c.category_name FROM property_master p JOIN host_master h ON p.host_id = h.host_id LEFT JOIN accommodation_category_master c ON c.category_id = p.category_id WHERE p.list_status = 1 AND p.host_id = ? ORDER BY p.created_at desc`, [host_id]);
};

export const getAllHostPropertyListing = async (host_id) => {
    return db.query(`SELECT p.* , h.first_name as host_first_name, h.last_name as host_lost_name, c.category_name FROM property_master p JOIN host_master h ON p.host_id = h.host_id LEFT JOIN accommodation_category_master c ON c.category_id = p.category_id WHERE  p.list_type = 1 AND p.list_status = 0 AND p.host_id = ? ORDER BY p.created_at desc`, [host_id]);
};

export const getAllUsersBusiness = async () => {
    return db.query("SELECT * FROM users WHERE user_type = 2 ORDER BY created_at DESC")
}

export const getAllBusinessUsers = async (business_id) => {
    return db.query("SELECT * FROM users WHERE user_type = 1 AND added_by = ? ORDER BY created_at desc", [business_id])
}

export const getAllBlog = async () => {
    return db.query("SELECT * FROM blog_master ORDER BY created_at DESC")
}

export const getPropertyBookedCount = async (property_id) => {
    return db.query("SELECT COUNT(*) as booked_count FROM booking_master WHERE property_id =?", [property_id])
}

export const getAllSubUserBookings = async (ids) => {
    return db.query("SELECT COUNT(*) AS total_booking FROM booking_master WHERE user_id IN (?)", [ids])
}

export const getReviewSubmittedCount = async (user_id) => {
    return db.query("SELECT COUNT(*) as review_count FROM rating_master WHERE user_id = ?", [user_id])
}

export const getAllHostBookings = async (host_id) => {
    return db.query("SELECT COUNT(*) AS total_booking FROM booking_master WHERE host_id = ? ", [host_id])
}

export const getAllUserBookings = async (user_id) => {
    return db.query("SELECT COUNT(*) AS total_booking FROM booking_master WHERE user_id = ? ", [user_id])
}

export const getDocumentDashboardCount = async () => {
    return db.query('SELECT    (SELECT COUNT(*) FROM document_master) AS total_verification,    (SELECT COUNT(*) FROM document_master WHERE status  = 0) AS total_pending,    (SELECT COUNT(*) FROM document_master WHERE status  = 1) AS total_approved,    (SELECT COUNT(*) FROM document_master WHERE status  = 2) AS total_rejected');
}

export const getGuestDocument = async (user_id) => {
    return db.query('SELECT d.*,u.first_name,u.last_name,u.email,u.phone,u.profile_image,CASE d.status WHEN 0 THEN "Pending" WHEN 1 THEN "Approved" WHEN 2 THEN "Rejected" END AS status_label FROM document_master d JOIN users u ON u.id = d.id WHERE d.user_type = 1 AND u.user_type = 1 ORDER BY d.created_at DESC', [user_id]);
}

export const getGuestDocumentById = async (user_id, user_type) => {
    return db.query('SELECT d.*,u.first_name,u.last_name,u.email,u.phone,u.profile_image,CASE d.status WHEN 0 THEN "Pending" WHEN 1 THEN "Approved" WHEN 2 THEN "Rejected" END AS status_label FROM document_master d JOIN users u ON u.id = d.id WHERE d.user_type = ?  AND d.id = ? ORDER BY d.created_at DESC', [user_type, user_id]);
}

export const getHostDocumentByIdModel = async (user_id, user_type) => {
    return db.query('SELECT d.*,u.first_name,u.last_name,u.email,u.phone,u.profile_image,CASE d.status WHEN 0 THEN "Pending" WHEN 1 THEN "Approved" WHEN 2 THEN "Rejected" END AS status_label  FROM document_master d JOIN users u ON u.id = d.id WHERE d.user_type = ? AND d.id = ? ORDER BY d.created_at DESC', [user_type, user_id]);
}

export const getGuestBusinessDocument = async () => {
    return db.query('SELECT d.*,u.first_name,u.last_name,u.email,u.phone,u.profile_image,CASE d.status WHEN 0 THEN "Pending" WHEN 1 THEN "Approved" WHEN 2 THEN "Rejected" END AS status_label  FROM document_master d JOIN users u ON u.id = d.id WHERE d.user_type = 2 AND u.user_type = 2 ORDER BY d.created_at DESC', []);
}

export const getHostDocument = async (user_id) => {
    return db.query('SELECT d.*,u.first_name,u.last_name,u.email,u.phone,u.profile_image,CASE d.status WHEN 0 THEN "Pending" WHEN 1 THEN "Approved" WHEN 2 THEN "Rejected" END AS status_label  FROM document_master d JOIN host_master u ON u.host_id = d.id WHERE d.user_type = 2 AND u.user_type = 1 ORDER BY d.created_at DESC', [user_id]);
}

export const getHostBusinessDocument = async (user_id) => {
    return db.query('SELECT d.*,u.first_name,u.last_name,u.email,u.phone,u.profile_image,CASE d.status WHEN 0 THEN "Pending" WHEN 1 THEN "Approved" WHEN 2 THEN "Rejected" END AS status_label  FROM document_master d JOIN host_master u ON u.host_id = d.id WHERE d.user_type = 2 AND u.user_type = 2 ORDER BY d.created_at DESC', [user_id]);
}


export const getUserSupportQuery = async () => {
    return db.query("SELECT s.*,p.property_title,h.first_name as host_first_name , h.last_name as host_last_name,u.first_name as user_first_name , u.last_name as user_last_name FROM support_ticket_master s LEFT JOIN property_master p ON p.property_id = s.property_id LEFT JOIN host_master h ON h.host_id = p.host_id JOIN users u ON u.id = s.id WHERE s.user_type = 1 ORDER BY s.created_at DESC", []);
}

export const getHostSupportQuery = async () => {
    return db.query("SELECT s.*,h.first_name as host_first_name , h.last_name as host_last_name FROM support_ticket_master s LEFT JOIN host_master h ON h.host_id = s.id  WHERE s.user_type = 2 ORDER BY s.created_at DESC", []);
}

export const getsingleSupportQuery = async (ticket_id) => {
    return db.query("SELECT s.*,p.property_title,h.first_name as host_first_name , h.last_name as host_last_name,u.first_name as user_first_name , u.last_name as user_last_name FROM support_ticket_master s LEFT JOIN property_master p ON p.property_id = s.property_id LEFT JOIN host_master h ON h.host_id = p.host_id JOIN users u ON u.id = s.id WHERE s.ticket_id = ?", [ticket_id]);
}

export const getPropertyBookingsCount = async (property_id) => {
    return db.query("SELECT COUNT(*) AS total_booking FROM booking_master WHERE property_id = ? AND  booking_status = 1 AND payment_status = 1", [property_id])
}

export const updateKycDocumentStatus = async (status, id, user_type, rejected_reason) => {
    return db.query("UPDATE document_master SET status = ? ,rejected_reason = ?  WHERE id = ? AND user_type = ?", [status, rejected_reason, id, user_type,]);
}

export const getPendingBookings = async () => {
    return db.query(
        `
    SELECT 
        b.*, 
        p.*, 
        u.first_name AS user_first_name,
        u.last_name AS user_last_name,
        u.email AS user_email,
        u.profile_image AS user_profile_image,
        h.first_name AS host_first_name,
        h.last_name AS host_last_name,
        h.email AS host_email,
        h.profile_image AS host_profile_image,
        c.category_name
    FROM booking_master b
    LEFT JOIN property_master p ON p.property_id = b.property_id
    LEFT JOIN users u ON u.id = b.user_id
    LEFT JOIN host_master h ON h.host_id = b.host_id
    LEFT JOIN accommodation_category_master c ON c.category_id = p.category_id
    WHERE b.booking_status = 0
    ORDER BY b.created_at DESC
    `,
        []
    );
};


export const getApprovedBookings = async () => {
    return db.query(
        `
    SELECT 
        b.*, 
        p.*, 
        u.first_name AS user_first_name,
        u.last_name AS user_last_name,
        u.email AS user_email,
        u.profile_image AS user_profile_image,
        h.first_name AS host_first_name,
        h.last_name AS host_last_name,
        h.email AS host_email,
        h.profile_image AS host_profile_image,
        c.category_name,
        CASE
        WHEN NOW() BETWEEN b.booked_from AND b.booked_to THEN 'Current Booking'
        WHEN NOW() < b.booked_from THEN 'Upcoming Booking'
        WHEN NOW() > b.booked_to THEN 'Past Booking'
        ELSE 'Unknown'
    END AS current_booking_status
    FROM booking_master b
    LEFT JOIN property_master p ON p.property_id = b.property_id
    LEFT JOIN users u ON u.id = b.user_id
    LEFT JOIN host_master h ON h.host_id = b.host_id
    LEFT JOIN accommodation_category_master c ON c.category_id = p.category_id
    WHERE b.booking_status = 1
    ORDER BY b.created_at DESC
    `,
        []
    );
};

export const getRejectedBookings = async () => {
    return db.query(
        `
    SELECT 
        b.*, 
        p.*, 
        u.first_name AS user_first_name,
        u.last_name AS user_last_name,
        u.email AS user_email,
        u.profile_image AS user_profile_image,
        h.first_name AS host_first_name,
        h.last_name AS host_last_name,
        h.email AS host_email,
        h.profile_image AS host_profile_image,
        c.category_name
    FROM booking_master b
    LEFT JOIN property_master p ON p.property_id = b.property_id
    LEFT JOIN users u ON u.id = b.user_id
    LEFT JOIN host_master h ON h.host_id = b.host_id
    LEFT JOIN accommodation_category_master c ON c.category_id = p.category_id
    WHERE b.booking_status = 1
    ORDER BY b.created_at DESC
    `,
        []
    );
};

export const getBookingById = async (booking_id) => {
    return db.query(
        `
    SELECT 
        b.*, 
        p.*, 
        u.first_name AS user_first_name,
        u.last_name AS user_last_name,
        u.email AS user_email,
        u.profile_image AS user_profile_image,
        h.first_name AS host_first_name,
        h.last_name AS host_last_name,
        h.email AS host_email,
        h.profile_image AS host_profile_image,
        c.category_name,
          CASE
        WHEN NOW() BETWEEN b.booked_from AND b.booked_to THEN 'Checked-In'
        WHEN NOW() < b.booked_from THEN 'Upcoming'
        WHEN NOW() > b.booked_to THEN 'Checked-Out'
        ELSE 'Unknown'
    END AS current_booking_status
    FROM booking_master b
    LEFT JOIN property_master p ON p.property_id = b.property_id
    LEFT JOIN users u ON u.id = b.user_id
    LEFT JOIN host_master h ON h.host_id = b.host_id
    LEFT JOIN accommodation_category_master c ON c.category_id = p.category_id
    WHERE b.booking_id = ?
    ORDER BY b.created_at DESC
    `,
        [booking_id]
    );
};

export const getBookingOverviewCounts = async () => {
    return db.query(
        `SELECT
            (SELECT COUNT(*) FROM booking_master ) AS total_bookings,
            (SELECT COUNT(*) FROM booking_master WHERE booking_status = 0 ) AS total_pending_bookings,
            (SELECT COUNT(*) FROM booking_master WHERE booking_status = 1 AND booked_to < CURRENT_DATE AND (is_canceled IS NULL OR is_canceled = '' OR is_canceled = 'No')) AS completed,
            (SELECT COUNT(*) FROM booking_master WHERE booking_status = 1 AND booked_from > CURRENT_DATE AND (is_canceled IS NULL OR is_canceled = '' OR is_canceled = 'No')) AS upcoming,
            (SELECT COUNT(*) FROM booking_master WHERE booking_status = 2 OR (is_canceled IS NOT NULL AND is_canceled <> '' AND is_canceled <> 'No')) AS cancelled
        `
    );
};

export const getBookingOverviewList = async (search, date, status) => {
    let where = `WHERE 1=1`;
    const params = [];

    if (search) {
        where += ` AND (p.property_title LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ? OR h.first_name LIKE ? OR h.last_name LIKE ?)`;
        const like = `%${search}%`;
        params.push(like, like, like, like, like);
    }

    if (date) {
        where += ` AND DATE(b.booked_from) = ?`;
        params.push(date);
    }

    if (status) {
        if (status === "completed") {
            where += ` AND b.booking_status = 1 AND b.booked_to < CURRENT_DATE AND (b.is_canceled IS NULL OR b.is_canceled = '' OR b.is_canceled = 'No')`;
        } else if (status === "upcoming") {
            where += ` AND b.booking_status = 1 AND b.booked_from > CURRENT_DATE AND (b.is_canceled IS NULL OR b.is_canceled = '' OR b.is_canceled = 'No')`;
        } else if (status === "cancelled") {
            where += ` AND (b.booking_status = 2 OR (b.is_canceled IS NOT NULL AND b.is_canceled <> '' AND b.is_canceled <> 'No'))`;
        } else if (status === "pending") {
            where += ` AND b.booking_status = 0`;
        } else if (status === "checked_in") {
            where += ` AND b.booking_status = 1 AND CURRENT_DATE BETWEEN b.booked_from AND b.booked_to AND (b.is_canceled IS NULL OR b.is_canceled = '' OR b.is_canceled = 'No')`;
        }
    }

    return db.query(
        `SELECT 
            b.booking_id,
            b.booked_from,
            b.booked_to,
            b.booking_status,
            b.is_canceled,
            b.created_at,
            p.property_title,
            p.monthly_rent,
            c.category_name,
            u.first_name AS user_first_name,
            u.last_name AS user_last_name,
            h.first_name AS host_first_name,
            h.last_name AS host_last_name
        FROM booking_master b
        LEFT JOIN property_master p ON p.property_id = b.property_id
        LEFT JOIN accommodation_category_master c ON c.category_id = p.category_id
        LEFT JOIN users u ON u.id = b.user_id
        LEFT JOIN host_master h ON h.host_id = b.host_id
        ${where}
        ORDER BY b.created_at DESC`,
        params
    );
};

export const getBookingOverviewByIdModel = async (booking_id) => {
    return db.query(
        `SELECT
            b.booking_id,
            b.booked_from,
            b.booked_to,
            b.booking_status,
            b.is_canceled,
            b.created_at,
            p.property_title,
            p.monthly_rent,
            c.category_name,
            u.first_name AS user_first_name,
            u.last_name AS user_last_name,
            h.first_name AS host_first_name,
            h.last_name AS host_last_name
        FROM booking_master b
        LEFT JOIN property_master p ON p.property_id = b.property_id
        LEFT JOIN accommodation_category_master c ON c.category_id = p.category_id
        LEFT JOIN users u ON u.id = b.user_id
        LEFT JOIN host_master h ON h.host_id = b.host_id
        WHERE b.booking_id = ?
        LIMIT 1`,
        [booking_id]
    );
};

export const getAllReviewsForAdmin = async () => {
  return db.query(
    `SELECT
        r.rating_id,
        r.rating,
        r.review,
        r.created_at,
        CASE 
          WHEN COALESCE(r.is_admin_created, 0) = 1 THEN r.first_name
          ELSE u.first_name
        END AS user_first_name,
    
        CASE 
          WHEN COALESCE(r.is_admin_created, 0) = 1 THEN r.last_name
          ELSE u.last_name
        END AS user_last_name,

        h.first_name AS host_first_name,
        h.last_name AS host_last_name,
        p.property_title,
        p.property_id 
     FROM rating_master r
     LEFT JOIN users u 
        ON u.id = r.user_id
     LEFT JOIN booking_master b 
        ON b.booking_id = r.booking_id
     LEFT JOIN property_master p 
        ON p.property_id = r.property_id
     LEFT JOIN host_master h 
        ON h.host_id = p.host_id
     ORDER BY r.created_at DESC`
  );
};


export const checkCommissionExists = async (fee_id, location, country) => {
    return db.query("SELECT * FROM fee_master WHERE fee_id != ? AND location = ? AND country = ?", [fee_id, location, country]);
};

export const getServiceFeeModel = async (location, country) => {
    return db.query("SELECT * FROM fee_master WHERE location = ? AND country = ?", [location, country]);
};

export const getAllServiceFeeModel = async () => {
    return db.query("SELECT fee_id ,commission,location,country,created_at,state	 FROM fee_master WHERE user_type = 2 ORDER BY created_at DESC");
};

export const getAllSubscriptionPlans = async () => {
    return db.query(
        "SELECT * FROM subscription_master WHERE is_deleted = 0 ORDER BY created_at DESC"
    );
};

export const getSubscriptionByIdModel = async (subscription_id) => {
    return db.query(
        "SELECT * FROM subscription_master WHERE subscription_id = ? AND is_deleted = 0",
        [subscription_id]
    );
};

export const getSubscriptionByPlanKeyModel = async (plan_key) => {
    return db.query(
        "SELECT * FROM subscription_master WHERE plan_key = ? AND is_deleted = 0",
        [plan_key]
    );
};

export const getSubscriptionByPlanKeyAnyModel = async (plan_key) => {
    return db.query(
        "SELECT * FROM subscription_master WHERE plan_key = ?",
        [plan_key]
    );
};

export const getSeoSettings = async () => {
    return db.query(
        "SELECT * FROM seo_management WHERE is_deleted = 0 ORDER BY created_at DESC"
    );
};

export const upsertSeoSettings = async (data, id = null) => {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const escapedColumns = columns.map((column) => `\`${column}\``);

    if (id) {
        const setClause = escapedColumns.map((column) => `${column} = ?`).join(", ");
        return db.query(
            `UPDATE seo_management SET ${setClause} WHERE id = ?`,
            [...values, id]
        );
    }

    const placeholders = columns.map(() => "?").join(", ");
    return db.query(
        `INSERT INTO seo_management (${escapedColumns.join(", ")}) VALUES (${placeholders})`,
        values
    );
};


export const getManagePayoutListModel = async (report_id) => {
    const query = `
      SELECT 
        pm.payment_id,
        pm.booking_id,
        pm.total_amount,
        pm.admin_earnings,
        COALESCE(
          pm.host_payout_amount,
          ROUND(COALESCE(pm.total_amount, 0) - COALESCE(pm.admin_earnings, 0), 2)
        ) AS host_payout_amount,
        pm.payment_status,
        COALESCE(pm.payout_status, 'PENDING') AS payout_status,
        pm.release_on,
        pm.payout_released_at,
        pm.stripe_transfer_id,
        pm.payout_failure_reason,
        pm.currency,
        pm.created_at,
        u.first_name AS guest_first_name,
        u.last_name AS guest_last_name,
        h.first_name AS host_first_name,
        h.last_name AS host_last_name,
        h.email AS host_email,
        b.booked_from,
        b.booked_to,
        p.property_title
      FROM payment_master pm
      LEFT JOIN users u ON pm.user_id = u.id
      LEFT JOIN booking_master b ON pm.booking_id = b.booking_id
      LEFT JOIN host_master h ON b.host_id = h.host_id
      LEFT JOIN property_master p ON b.property_id = p.property_id
      ORDER BY pm.created_at DESC
    `;
    const rows = await db.query(query);
    return rows;
};

export const getPayoutDashboardModel = async () => {
    const query = `
      SELECT
        COALESCE(SUM(CASE WHEN pm.payment_status = 'COMPLETED' THEN pm.admin_earnings ELSE 0 END), 0) AS total_admin_earnings,
        COALESCE(
          SUM(
            CASE 
              WHEN pm.payment_status = 'COMPLETED'
              THEN COALESCE(pm.host_payout_amount, ROUND(COALESCE(pm.total_amount, 0) - COALESCE(pm.admin_earnings, 0), 2))
              ELSE 0
            END
          ),
          0
        ) AS total_host_payout,
        COALESCE(
          SUM(
            CASE 
              WHEN pm.payment_status = 'COMPLETED' AND COALESCE(pm.payout_status, 'PENDING') = 'PENDING'
              THEN COALESCE(pm.host_payout_amount, ROUND(COALESCE(pm.total_amount, 0) - COALESCE(pm.admin_earnings, 0), 2))
              ELSE 0
            END
          ),
          0
        ) AS total_pending_payout,
        COALESCE(
          SUM(
            CASE 
              WHEN pm.payment_status = 'COMPLETED' AND COALESCE(pm.payout_status, 'PENDING') = 'PAID'
              THEN COALESCE(pm.host_payout_amount, ROUND(COALESCE(pm.total_amount, 0) - COALESCE(pm.admin_earnings, 0), 2))
              ELSE 0
            END
          ),
          0
        ) AS total_paid_out,
        COALESCE(
          SUM(
            CASE 
              WHEN pm.payment_status = 'COMPLETED' AND COALESCE(pm.payout_status, 'PENDING') = 'FAILED'
              THEN COALESCE(pm.host_payout_amount, ROUND(COALESCE(pm.total_amount, 0) - COALESCE(pm.admin_earnings, 0), 2))
              ELSE 0
            END
          ),
          0
        ) AS total_failed_payout,
        COALESCE(SUM(CASE WHEN pm.payment_status = 'COMPLETED' THEN 1 ELSE 0 END), 0) AS completed_payment_count,
        COALESCE(SUM(CASE WHEN COALESCE(pm.payout_status, 'PENDING') = 'PENDING' AND pm.payment_status = 'COMPLETED' THEN 1 ELSE 0 END), 0) AS pending_payout_count,
        COALESCE(SUM(CASE WHEN COALESCE(pm.payout_status, 'PENDING') = 'PAID' THEN 1 ELSE 0 END), 0) AS paid_payout_count,
        COALESCE(SUM(CASE WHEN COALESCE(pm.payout_status, 'PENDING') = 'FAILED' THEN 1 ELSE 0 END), 0) AS failed_payout_count
      FROM payment_master
      pm
    `;
    const rows = await db.query(query);
    return rows[0] || {};
};

export const getPropertyCommissionReportModel = async (filters = {}) => {
    const {
        property_id,
        host_id,
        payment_status,
        payout_status,
        from_date,
        to_date,
    } = filters;

    const conditions = [];
    const params = [];

    if (property_id) {
        conditions.push("b.property_id = ?");
        params.push(Number(property_id));
    }

    if (host_id) {
        conditions.push("b.host_id = ?");
        params.push(Number(host_id));
    }

    if (payment_status) {
        conditions.push("pm.payment_status = ?");
        params.push(String(payment_status));
    }

    if (payout_status) {
        conditions.push("COALESCE(pm.payout_status, 'PENDING') = ?");
        params.push(String(payout_status));
    }

    if (from_date) {
        conditions.push("DATE(pm.created_at) >= ?");
        params.push(from_date);
    }

    if (to_date) {
        conditions.push("DATE(pm.created_at) <= ?");
        params.push(to_date);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const query = `
      SELECT
        b.property_id,
        p.property_title,
        p.address,
        b.host_id,
        CONCAT(COALESCE(h.first_name, ''), ' ', COALESCE(h.last_name, '')) AS host_name,
        h.email AS host_email,
        COUNT(DISTINCT b.booking_id) AS total_bookings,
        COUNT(DISTINCT pm.payment_id) AS total_payments,
        ROUND(COALESCE(SUM(CASE WHEN pm.payment_status = 'COMPLETED' THEN pm.total_amount ELSE 0 END), 0), 2) AS total_booking_amount,
        ROUND(COALESCE(SUM(CASE WHEN pm.payment_status = 'COMPLETED' THEN pm.admin_earnings ELSE 0 END), 0), 2) AS total_commission_cut,
        ROUND(COALESCE(SUM(CASE WHEN pm.payment_status = 'COMPLETED' THEN pm.admin_earnings ELSE 0 END), 0), 2) AS total_admin_earnings,
        ROUND(
          COALESCE(
            SUM(
              CASE
                WHEN pm.payment_status = 'COMPLETED'
                THEN COALESCE(pm.host_payout_amount, ROUND(COALESCE(pm.total_amount, 0) - COALESCE(pm.admin_earnings, 0), 2))
                ELSE 0
              END
            ),
            0
          ),
          2
        ) AS total_host_amount,
        ROUND(
          COALESCE(
            SUM(
              CASE
                WHEN pm.payment_status = 'COMPLETED' AND COALESCE(pm.payout_status, 'PENDING') = 'PAID'
                THEN COALESCE(pm.host_payout_amount, ROUND(COALESCE(pm.total_amount, 0) - COALESCE(pm.admin_earnings, 0), 2))
                ELSE 0
              END
            ),
            0
          ),
          2
        ) AS total_host_paid,
        ROUND(
          COALESCE(
            SUM(
              CASE
                WHEN pm.payment_status = 'COMPLETED' AND COALESCE(pm.payout_status, 'PENDING') = 'PENDING'
                THEN COALESCE(pm.host_payout_amount, ROUND(COALESCE(pm.total_amount, 0) - COALESCE(pm.admin_earnings, 0), 2))
                ELSE 0
              END
            ),
            0
          ),
          2
        ) AS total_host_pending,
        ROUND(
          COALESCE(
            SUM(
              CASE
                WHEN pm.payment_status = 'COMPLETED' AND COALESCE(pm.payout_status, 'PENDING') = 'FAILED'
                THEN COALESCE(pm.host_payout_amount, ROUND(COALESCE(pm.total_amount, 0) - COALESCE(pm.admin_earnings, 0), 2))
                ELSE 0
              END
            ),
            0
          ),
          2
        ) AS total_host_failed,
        MAX(pm.created_at) AS last_payment_at
      FROM payment_master pm
      INNER JOIN booking_master b ON b.booking_id = pm.booking_id
      LEFT JOIN property_master p ON p.property_id = b.property_id
      LEFT JOIN host_master h ON h.host_id = b.host_id
      ${whereClause}
      GROUP BY b.property_id, p.property_title, p.address, b.host_id, h.first_name, h.last_name, h.email
      ORDER BY last_payment_at DESC, b.property_id DESC
    `;

    return db.query(query, params);
};

export const getAllPropertyCommissionReportModel = async (filters = {}) => {
    const {
        property_id,
        host_id,
        payment_status,
        payout_status,
        from_date,
        to_date,
    } = filters;

    const conditions = [];
    const params = [];

    if (property_id) {
        conditions.push("b.property_id = ?");
        params.push(Number(property_id));
    }

    if (host_id) {
        conditions.push("b.host_id = ?");
        params.push(Number(host_id));
    }

    if (payment_status) {
        conditions.push("pm.payment_status = ?");
        params.push(String(payment_status));
    }

    if (payout_status) {
        conditions.push("COALESCE(pm.payout_status, 'PENDING') = ?");
        params.push(String(payout_status));
    }

    if (from_date) {
        conditions.push("DATE(pm.created_at) >= ?");
        params.push(from_date);
    }

    if (to_date) {
        conditions.push("DATE(pm.created_at) <= ?");
        params.push(to_date);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const query = `
      SELECT
        pm.payment_id,
        pm.booking_id,
        b.property_id,
        p.property_title,
        p.address,
        b.host_id,
        CONCAT(COALESCE(h.first_name, ''), ' ', COALESCE(h.last_name, '')) AS host_name,
        h.email AS host_email,
        CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, '')) AS guest_name,
        u.email AS guest_email,
        ROUND(COALESCE(pm.total_amount, 0), 2) AS total_booking_amount,
        ROUND(COALESCE(pm.admin_earnings, 0), 2) AS commission_cut,
        ROUND(COALESCE(pm.admin_earnings, 0), 2) AS admin_earnings,
        ROUND(
          COALESCE(pm.host_payout_amount, ROUND(COALESCE(pm.total_amount, 0) - COALESCE(pm.admin_earnings, 0), 2)),
          2
        ) AS host_amount,
        pm.payment_status,
        COALESCE(pm.payout_status, 'PENDING') AS payout_status,
        pm.currency,
        pm.release_on,
        pm.payout_released_at,
        pm.stripe_transfer_id,
        pm.payout_failure_reason,
        b.booked_from,
        b.booked_to,
        pm.created_at
      FROM payment_master pm
      INNER JOIN booking_master b ON b.booking_id = pm.booking_id
      LEFT JOIN property_master p ON p.property_id = b.property_id
      LEFT JOIN host_master h ON h.host_id = b.host_id
      LEFT JOIN users u ON u.id = pm.user_id
      ${whereClause}
      ORDER BY pm.created_at DESC, pm.payment_id DESC
    `;

    return db.query(query, params);
};

export const fetchallInquiriesModel = async () => {
    const query = `
    SELECT 
      i.inquiry_id,
      i.message,
      i.email,
      i.created_at,

      -- User Name (if exists else Guest User)
      CASE 
        WHEN i.user_id = 0 
        THEN 'Guest User'
        ELSE i.name
      END AS user_name,

      p.property_title,

      CONCAT(h.first_name, ' ', h.last_name) AS host_name

    FROM inquiry_master i
    LEFT JOIN users u ON i.user_id = u.id
    LEFT JOIN property_master p ON i.property_id = p.property_id
    LEFT JOIN host_master h ON i.host_id = h.host_id
    ORDER BY i.created_at DESC
  `;

    const rows = await db.query(query);
    return rows;
};


export const fetchSeoMasterByPageSlug = async (page_slug) => {
    return db.query("SELECT * FROM seo_management WHERE page_slug = ?", [page_slug]);
}


export const getAllRatingsForAdmin = async () => {
    const query = `
    SELECT 
      r.rating_id,
      r.rating,
      r.review,
      r.created_at,

      -- User Name Logic
      CASE 
        WHEN COALESCE(r.is_admin_created::text, '') IN ('1', 'true', 't') 
          THEN CONCAT(r.first_name, ' ', r.last_name)
        ELSE CONCAT(u.first_name, ' ', u.last_name)
      END AS user_name,

      -- Host Name
      CONCAT(h.first_name, ' ', h.last_name) AS host_name,

      p.property_title

    FROM rating_master r
    LEFT JOIN users u ON r.user_id = u.id
    LEFT JOIN property_master p ON r.property_id = p.property_id
    LEFT JOIN host_master h ON p.host_id = h.host_id

    ORDER BY r.rating_id DESC
  `;

    const rows = await db.query(query);
    return rows;
};


export const getAdminNotifications = async (admin_id) => {
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
    AND receiver_type = 'admin'
    ORDER BY notification_id DESC
  `;

    const result = await db.query(query, [admin_id]);
    return result;
};


export const getAllOfferListModel = async () => {
    const query = ` SELECT o.*, p.property_title FROM property_offer_master o
    LEFT JOIN property_master p ON o.property_id = p.property_id
    ORDER BY o.created_at DESC, o.offer_id DESC`;
    const rows = await db.query(query);
    return rows;
};


// CREATE
export const createCancellationPolicyModel = async ({
  policy_name,
  days_before,
  host_percentage,
  admin_percentage
}) => {

  const query = `
    INSERT INTO cancellation_policies 
    (policy_name, days_before, host_percentage, admin_percentage)
    VALUES ($1, $2, $3, $4)
    RETURNING *;
  `;

  const result = await db.query(query, [
    policy_name,
    days_before,
    host_percentage,
    admin_percentage
  ]);

  return result.rows[0];
};


// GET ALL
export const getCancellationPoliciesModel = async () => {

  const query = `
    SELECT * FROM cancellation_policies
    WHERE is_active = true
    ORDER BY days_before DESC;
  `;

  const result = await db.query(query);
  return result;
};


// GET BY ID
export const getCancellationPolicyByIdModel = async (policy_id) => {

  const query = `
    SELECT * FROM cancellation_policies
    WHERE id = $1 AND is_active = true;
  `;

  const result = await db.query(query, [policy_id]);
  return result.rows[0];
};


// UPDATE
export const updateCancellationPolicyModel = async ({
  policy_id,
  policy_name,
  days_before,
  host_percentage,
  admin_percentage
}) => {

  const query = `
    UPDATE cancellation_policies
    SET policy_name = $1,
        days_before = $2,
        host_percentage = $3,
        admin_percentage = $4,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $5
    RETURNING *;
  `;

  const result = await db.query(query, [
    policy_name,
    days_before,
    host_percentage,
    admin_percentage,
    policy_id
  ]);

  return result.rows[0];
};


// DELETE (soft)
export const deleteCancellationPolicyModel = async (policy_id) => {

  const query = `
    UPDATE cancellation_policies
    SET is_active = false
    WHERE id = $1;
  `;

  await db.query(query, [policy_id]);
};
