const { query } = require('../db/connection');
const { runLifecycleChecks } = require('../services/bookingLifecycle');

/**
 * GET /api/worker-portal/dashboard
 * Aggregated dashboard metrics for the logged-in worker.
 */
async function getWorkerDashboard(req, res) {
  try {
    // Run automated lifecycle reconciliation (10m/30m acceptance timeout & next-day completion)
    await runLifecycleChecks();

    const userId = req.user.id;

    // Find worker record
    const workerRes = await query(`
      SELECT w.*, u.name, u.email, u.phone, u.district, u.city, u.address, u.pincode,
             c.name as cooperative_name, c.registration_number as cooperative_reg, c.contact_phone as cooperative_phone,
             s.name as society_name, s.society_code,
             (w.society_id IS NULL) as is_independent
      FROM workers w
      JOIN users u ON w.user_id = u.id
      JOIN cooperatives c ON w.cooperative_id = c.id
      LEFT JOIN societies s ON w.society_id = s.id
      WHERE w.user_id = $1
    `, [userId]);

    const worker = workerRes.rows[0];
    if (!worker) {
      return res.status(404).json({ error: 'Not Found', message: 'Worker profile not found for this account.' });
    }

    // Worker skills
    const skillsRes = await query(`
      SELECT s.id, s.name, s.category, ws.proficiency_level
      FROM worker_skills ws
      JOIN skills s ON ws.skill_id = s.id
      WHERE ws.worker_id = $1
    `, [worker.id]);
    const skills = skillsRes.rows;

    // Worker certifications
    const certsRes = await query(`
      SELECT * FROM certifications WHERE worker_id = $1 ORDER BY issue_date DESC
    `, [worker.id]);
    const certifications = certsRes.rows;

    // Incoming requests (REQUESTED for worker's trade category and district/city, OR MATCHED to this worker)
    const incomingRes = await query(`
      SELECT b.*, s.name as service_name, s.category as service_category, s.icon as service_icon,
             u.name as customer_name, u.phone as customer_phone
      FROM bookings b
      JOIN services s ON b.service_id = s.id
      JOIN users u ON b.customer_id = u.id
      WHERE (b.worker_id = $1 AND b.status = 'MATCHED')
         OR (
              b.worker_id IS NULL 
              AND b.status = 'REQUESTED' 
              AND (b.declined_worker_ids IS NULL OR b.declined_worker_ids NOT LIKE '%,' || $1 || ',%')
              AND (
                b.location_district = $2 
                OR $2 IS NULL 
                OR b.location_district IS NULL 
                OR b.location_city = $4
              )
              AND (
                $3 = '' OR $3 IS NULL
                OR $3 ILIKE '%' || s.category || '%'
                OR s.category ILIKE '%' || $3 || '%'
                OR s.category = 'Emergency Services'
                OR EXISTS (
                  SELECT 1 FROM worker_skills ws
                  JOIN skills sk ON ws.skill_id = sk.id
                  WHERE ws.worker_id = $1
                    AND (sk.category ILIKE s.category OR s.category ILIKE '%' || sk.category || '%' OR sk.name ILIKE '%' || s.name || '%')
                )
              )
            )
      ORDER BY b.is_emergency DESC, b.id DESC
      LIMIT 15
    `, [worker.id, worker.district || 'Khordha', worker.primary_trade || '', worker.city || 'Bhubaneswar']);
    const incomingJobs = incomingRes.rows;

    // Active Jobs (ACCEPTED or IN_PROGRESS)
    const activeRes = await query(`
      SELECT b.*, s.name as service_name, s.category as service_category, s.icon as service_icon,
             u.name as customer_name, u.phone as customer_phone
      FROM bookings b
      JOIN services s ON b.service_id = s.id
      JOIN users u ON b.customer_id = u.id
      WHERE (b.worker_id = $1 OR b.paired_master_worker_id = $1) AND b.status IN ('ACCEPTED', 'IN_PROGRESS')
      ORDER BY b.id DESC
    `, [worker.id]);
    const activeJobs = activeRes.rows;

    // Auto-heal worker availability: If artisan is actively assigned to live jobs, they must be BUSY
    if (activeJobs.length > 0 && worker.availability === 'AVAILABLE') {
      await query(`
        UPDATE workers
        SET availability = 'BUSY', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [worker.id]);
      worker.availability = 'BUSY';
    }

    // Completed Jobs
    const completedRes = await query(`
      SELECT b.*, s.name as service_name, s.category as service_category,
             u.name as customer_name,
             p.status as payment_status,
             r.rating as review_rating, r.comment as review_comment
      FROM bookings b
      JOIN services s ON b.service_id = s.id
      JOIN users u ON b.customer_id = u.id
      LEFT JOIN payments p ON p.booking_id = b.id
      LEFT JOIN reviews r ON r.booking_id = b.id
      WHERE b.worker_id = $1 AND b.status = 'COMPLETED'
      ORDER BY b.id DESC
      LIMIT 20
    `, [worker.id]);
    const completedJobs = completedRes.rows;

    // Recent reviews
    const reviewsRes = await query(`
      SELECT r.*, u.name as customer_name, b.service_id, s.name as service_name
      FROM reviews r
      JOIN users u ON r.customer_id = u.id
      JOIN bookings b ON r.booking_id = b.id
      JOIN services s ON b.service_id = s.id
      WHERE r.worker_id = $1
      ORDER BY r.created_at DESC
      LIMIT 10
    `, [worker.id]);
    const reviews = reviewsRes.rows;

    // Welfare enrolled count
    const welfareCountRes = await query(`
      SELECT COUNT(*) as count FROM worker_welfare
      WHERE worker_id = $1 AND status = 'ENROLLED'
    `, [worker.id]);
    const welfareCount = parseInt(welfareCountRes.rows[0].count, 10);

    res.json({
      worker,
      skills,
      certifications,
      stats: {
        totalEarnings: worker.total_earnings || 0,
        totalJobsCompleted: worker.total_jobs_completed || 0,
        activeJobsCount: activeJobs.length,
        incomingJobsCount: incomingJobs.length,
        rating: worker.rating || 0,
        totalReviews: worker.total_reviews || 0,
        welfareEnrolledCount: welfareCount,
      },
      incomingJobs,
      activeJobs,
      completedJobs,
      reviews,
    });
  } catch (err) {
    console.error('Worker dashboard error:', err);
    res.status(500).json({ error: 'Server Error', message: 'Failed to fetch worker dashboard data.' });
  }
}

/**
 * PUT /api/worker-portal/availability
 * Update worker availability status (AVAILABLE, BUSY, OFFLINE).
 */
async function updateAvailability(req, res) {
  try {
    const { availability } = req.body;
    const userId = req.user.id;

    const allowed = ['AVAILABLE', 'BUSY', 'OFFLINE'];
    if (!allowed.includes(availability)) {
      return res.status(400).json({ error: 'Validation Error', message: 'Invalid availability status.' });
    }

    // Business rule: Both Cooperative Verification and Mandatory ISI Toolkit are required to go AVAILABLE
    if (availability === 'AVAILABLE') {
      const workerCheck = await query(`
        SELECT verification_status, toolkit_compliance 
        FROM workers 
        WHERE user_id = $1
      `, [userId]);
      const w = workerCheck.rows[0];
      if (!w || w.verification_status !== 'VERIFIED' || w.toolkit_compliance !== 'VERIFIED_EQUIPPED') {
        return res.status(403).json({
          error: 'Compliance Prerequisite Unmet',
          message: 'Both Cooperative Verification (VERIFIED) and Mandatory ISI Toolkit (VERIFIED_EQUIPPED) are strictly required before an artisan can go online and take jobs.'
        });
      }
    }

    // Business rule: Workers with active jobs (ACCEPTED or IN_PROGRESS) cannot be marked AVAILABLE or OFFLINE
    if (availability === 'AVAILABLE' || availability === 'OFFLINE') {
      const activeJobsCheck = await query(`
        SELECT b.id, b.booking_code, b.status, s.name as service_name
        FROM bookings b
        JOIN workers w ON (b.worker_id = w.id OR b.paired_master_worker_id = w.id)
        JOIN services s ON b.service_id = s.id
        WHERE w.user_id = $1 AND b.status IN ('ACCEPTED', 'IN_PROGRESS')
        LIMIT 1
      `, [userId]);

      if (activeJobsCheck.rows.length > 0) {
        const job = activeJobsCheck.rows[0];
        return res.status(400).json({
          error: 'Validation Error',
          message: `Cannot change availability to ${availability} while you have an active work order (${job.booking_code} - ${job.service_name} is ${job.status}). Please complete or update your active jobs first.`
        });
      }
    }

    await query(`
      UPDATE workers SET availability = $1, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $2
    `, [availability, userId]);

    res.json({ message: `Availability status updated to ${availability}`, availability });
  } catch (err) {
    console.error('Update availability error:', err);
    res.status(500).json({ error: 'Server Error', message: 'Failed to update availability.' });
  }
}

/**
 * PUT /api/worker-portal/jobs/:id/action
 * Handle worker dispatch action: ACCEPT, DECLINE, START, COMPLETE.
 */
async function handleJobAction(req, res) {
  try {
    const { action } = req.body;
    const bookingId = req.params.id;
    const userId = req.user.id;

    const workerRes = await query('SELECT id, verification_status, toolkit_compliance FROM workers WHERE user_id = $1', [userId]);
    const worker = workerRes.rows[0];
    if (!worker) {
      return res.status(404).json({ error: 'Not Found', message: 'Worker profile not found.' });
    }

    if (action === 'ACCEPT') {
      if (worker.verification_status !== 'VERIFIED' || worker.toolkit_compliance !== 'VERIFIED_EQUIPPED') {
        return res.status(403).json({
          error: 'Compliance Prerequisite Unmet',
          message: 'Both Cooperative Verification (VERIFIED) and Mandatory ISI Toolkit (VERIFIED_EQUIPPED) are strictly required before an artisan can accept work orders.'
        });
      }
    }

    const bookingRes = await query('SELECT * FROM bookings WHERE id = $1', [bookingId]);
    const booking = bookingRes.rows[0];
    if (!booking) {
      return res.status(404).json({ error: 'Not Found', message: 'Booking not found.' });
    }

    // ACCEPT is a claim on an open broadcast, so it is guarded by the atomic
    // conditional UPDATE below. DECLINE may target either a job matched to this
    // artisan or an open broadcast they are being offered. START and COMPLETE
    // mutate a live job that must already belong to them — without this check
    // any logged-in worker could start or complete someone else's booking by id.
    const isAssigned = booking.worker_id === worker.id;
    const isOpenBroadcast = booking.worker_id === null && booking.status === 'REQUESTED';

    if ((action === 'START' || action === 'COMPLETE') && !isAssigned) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'This job is not assigned to you.',
      });
    }

    if (action === 'DECLINE') {
      if (!isAssigned && !isOpenBroadcast) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'This job is not in your dispatch pool.',
        });
      }
      if (['IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(booking.status)) {
        return res.status(400).json({
          error: 'Bad Request',
          message: `A job that is already ${booking.status} cannot be declined.`,
        });
      }
    }

    if (action === 'START' && booking.status !== 'ACCEPTED') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Only an accepted job can be started.',
      });
    }

    if (action === 'ACCEPT') {
      // Check 10-min (emergency) / 30-min (standard) acceptance timeout
      const createdTime = new Date(booking.created_at).getTime();
      const elapsedMinutes = (Date.now() - createdTime) / (1000 * 60);
      const maxWindowMinutes = booking.is_emergency ? 10 : 30;

      if (elapsedMinutes > maxWindowMinutes && (booking.status === 'REQUESTED' || booking.status === 'MATCHED')) {
        await query(`
          UPDATE bookings
          SET status = 'CANCELLED',
              cancelled_at = CURRENT_TIMESTAMP,
              cancellation_reason = $1,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
        `, [
          `Auto-cancelled: ${booking.is_emergency ? 'Emergency' : 'Standard'} acceptance window (${maxWindowMinutes} mins) expired without artisan acceptance.`,
          bookingId
        ]);

        return res.status(410).json({
          error: 'Order Expired',
          message: `This service request has expired (${maxWindowMinutes}-minute acceptance window exceeded) and was automatically cancelled. Please refresh your dispatch pool.`
        });
      }

      // Generate 4-digit Security OTPs upon worker acceptance
      const arrivalOtp = Math.floor(1000 + Math.random() * 9000).toString();
      const completionOtp = Math.floor(1000 + Math.random() * 9000).toString();

      // First-to-Accept atomic claim: only claim if booking is still REQUESTED & unassigned (or MATCHED to this worker)
      const claimRes = await query(`
        UPDATE bookings
        SET status = 'ACCEPTED',
            worker_id = $1,
            arrival_otp = COALESCE(arrival_otp, $3),
            completion_otp = COALESCE(completion_otp, $4),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
          AND (
            (status = 'REQUESTED' AND worker_id IS NULL)
            OR (status = 'MATCHED' AND worker_id = $1)
          )
        RETURNING *
      `, [worker.id, bookingId, arrivalOtp, completionOtp]);
      if (claimRes.rows.length === 0) {
        return res.status(409).json({
          error: 'Order Already Claimed',
          message: 'This job request has already been accepted by another nearby artisan and is no longer available in the dispatch pool.'
        });
      }

      // Automatically change the worker status to BUSY in schedule slot
      await query(`
        UPDATE workers
        SET availability = 'BUSY', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [worker.id]);

      // Also update invoice with worker name and cooperative affiliation
      const workerInfoRes = await query(`
        SELECT u.name, c.name as cooperative_name, w.tier
        FROM workers w
        JOIN users u ON w.user_id = u.id
        JOIN cooperatives c ON w.cooperative_id = c.id
        WHERE w.id = $1
      `, [worker.id]);
      if (workerInfoRes.rows[0]) {
        const wInfo = workerInfoRes.rows[0];
        await query(`
          UPDATE invoices
          SET worker_name = $1, cooperative_name = $2
          WHERE booking_id = $3
        `, [`${wInfo.name} (${wInfo.tier} Artisan)`, wInfo.cooperative_name, bookingId]);
      }
    } else if (action === 'DECLINE') {
      await query(`
        UPDATE bookings
        SET status = 'REQUESTED',
            worker_id = NULL,
            declined_worker_ids = CASE 
              WHEN declined_worker_ids IS NULL OR declined_worker_ids = '' THEN ',' || $2 || ','
              WHEN declined_worker_ids NOT LIKE '%,' || $2 || ',%' THEN declined_worker_ids || $2 || ','
              ELSE declined_worker_ids
            END,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [bookingId, worker.id]);

      // If worker has no remaining active jobs, restore to AVAILABLE
      const remainingActive = await query(`
        SELECT COUNT(*) as count FROM bookings
        WHERE worker_id = $1 AND status IN ('ACCEPTED', 'IN_PROGRESS') AND id != $2
      `, [worker.id, bookingId]);

      if (parseInt(remainingActive.rows[0].count, 10) === 0) {
        await query(`
          UPDATE workers
          SET availability = 'AVAILABLE', updated_at = CURRENT_TIMESTAMP
          WHERE id = $1 AND availability = 'BUSY'
        `, [worker.id]);
      }
    } else if (action === 'START') {
      await query(`
        UPDATE bookings
        SET status = 'IN_PROGRESS', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [bookingId]);

      // Ensure worker status is BUSY while on-site
      await query(`
        UPDATE workers
        SET availability = 'BUSY', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [worker.id]);
    } else if (action === 'COMPLETE') {
      if (booking.status === 'COMPLETED') {
        return res.json({ message: 'Booking is already completed', booking });
      }
      const completedAt = new Date().toISOString();
      const guaranteeUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      await query(`
        UPDATE bookings
        SET status = 'COMPLETED', completed_at = $1, guarantee_armed_until = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `, [completedAt, guaranteeUntil, bookingId]);

      // Update worker stats
      await query(`
        UPDATE workers
        SET total_jobs_completed = total_jobs_completed + 1,
            total_earnings = total_earnings + $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [booking.amount || 299, worker.id]);

      // If worker has no other active jobs, restore to AVAILABLE
      const remainingActive = await query(`
        SELECT COUNT(*) as count FROM bookings
        WHERE worker_id = $1 AND status IN ('ACCEPTED', 'IN_PROGRESS') AND id != $2
      `, [worker.id, bookingId]);

      if (parseInt(remainingActive.rows[0].count, 10) === 0) {
        await query(`
          UPDATE workers
          SET availability = 'AVAILABLE', updated_at = CURRENT_TIMESTAMP
          WHERE id = $1 AND availability = 'BUSY'
        `, [worker.id]);
      }

      // Update invoice
      await query(`
        UPDATE invoices SET payment_status = 'PAID' WHERE booking_id = $1
      `, [bookingId]);
    } else {
      return res.status(400).json({ error: 'Validation Error', message: 'Invalid action.' });
    }

    const updatedRes = await query('SELECT * FROM bookings WHERE id = $1', [bookingId]);
    res.json({ message: `Job action ${action} processed successfully`, booking: updatedRes.rows[0] });
  } catch (err) {
    console.error('Job action error:', err);
    res.status(500).json({ error: 'Server Error', message: 'Failed to process job action.' });
  }
}

/**
 * GET /api/worker-portal/welfare
 * Get worker welfare and social security information.
 */
async function getWorkerWelfare(req, res) {
  try {
    const userId = req.user.id;

    const workerRes = await query(`
      SELECT w.id, w.worker_code, w.total_earnings, w.total_jobs_completed,
             c.name as cooperative_name
      FROM workers w
      JOIN cooperatives c ON w.cooperative_id = c.id
      WHERE w.user_id = $1
    `, [userId]);

    const worker = workerRes.rows[0];
    if (!worker) {
      return res.status(404).json({ error: 'Not Found', message: 'Worker profile not found.' });
    }

    const welfareRes = await query(`
      SELECT * FROM worker_welfare WHERE worker_id = $1 ORDER BY id ASC
    `, [worker.id]);

    const availableSchemes = [
      {
        benefit_type: 'Insurance',
        benefit_name: 'ESIC Group Accident Insurance',
        provider: 'Employees State Insurance Corp',
        details: '₹2,00,000 accidental coverage + disability support',
      },
      {
        benefit_type: 'Health',
        benefit_name: 'Cooperative Health Support & Annual Checkup',
        provider: 'Cooperative Labour Welfare Fund',
        details: 'Free annual health checkup + subsidized family diagnostics',
      },
      {
        benefit_type: 'Training',
        benefit_name: 'NSDC Advanced Trade Upskilling Workshop',
        provider: 'National Skill Development Corp / Vocational Network',
        details: 'Certified 2-week advanced appliance & green energy skill training',
      },
      {
        benefit_type: 'Pension',
        benefit_name: 'EPFO Social Security & Pension Scheme',
        provider: 'Employees Provident Fund Organisation',
        details: 'Monthly cooperative retirement corpus & pension contribution',
      },
      {
        benefit_type: 'Emergency',
        benefit_name: 'Cooperative Emergency Family Assistance',
        provider: 'District Labour Cooperative Federation Fund',
        details: 'Interest-free emergency assistance up to ₹25,000 for medical/disaster needs',
      },
    ];

    res.json({
      worker,
      welfareRecords: welfareRes.rows,
      availableSchemes,
      cooperativeLevyShare: '5% of every completed booking fee is directly credited to your PF & Insurance (Cooperative Welfare) Account',
      pocNotice: 'POC Welfare Integration: Real-world claim processing requires integration with authorized ESIC/EPFO digital portals and physical verification.',
    });
  } catch (err) {
    console.error('Get welfare error:', err);
    res.status(500).json({ error: 'Server Error', message: 'Failed to fetch welfare records.' });
  }
}

/**
 * POST /api/worker-portal/welfare/enroll
 * Apply / enroll for a welfare program.
 */
async function enrollWelfare(req, res) {
  try {
    const { benefit_type, benefit_name, provider, details } = req.body;
    const userId = req.user.id;

    const workerRes = await query('SELECT id FROM workers WHERE user_id = $1', [userId]);
    const worker = workerRes.rows[0];
    if (!worker) {
      return res.status(404).json({ error: 'Not Found', message: 'Worker profile not found.' });
    }

    const existingRes = await query(`
      SELECT id FROM worker_welfare
      WHERE worker_id = $1 AND benefit_name = $2
    `, [worker.id, benefit_name]);

    const todayDate = new Date().toISOString().split('T')[0];

    if (existingRes.rowCount > 0) {
      await query(`
        UPDATE worker_welfare
        SET status = 'ENROLLED', enrollment_date = $1
        WHERE id = $2
      `, [todayDate, existingRes.rows[0].id]);
    } else {
      await query(`
        INSERT INTO worker_welfare (worker_id, benefit_type, benefit_name, provider, status, enrollment_date, details)
        VALUES ($1, $2, $3, $4, 'ENROLLED', $5, $6)
      `, [worker.id, benefit_type, benefit_name, provider, todayDate, details]);
    }

    res.json({ message: `Successfully enrolled in ${benefit_name}` });
  } catch (err) {
    console.error('Enroll welfare error:', err);
    res.status(500).json({ error: 'Server Error', message: 'Failed to enroll in welfare scheme.' });
  }
}

/**
 * GET /api/worker-portal/toolkits
 * Get mandatory toolkit requirements, compliance status, catalog, and active orders/loans.
 */
async function getWorkerToolkits(req, res) {
  try {
    const userId = req.user.id;
    const workerRes = await query(`
      SELECT w.id, w.worker_code, w.primary_trade, w.tools_owned, w.toolkit_compliance, w.merit_points,
             u.name, u.phone, u.district, u.city, u.address, c.name as cooperative_name
      FROM workers w
      JOIN users u ON w.user_id = u.id
      JOIN cooperatives c ON w.cooperative_id = c.id
      WHERE w.user_id = $1
    `, [userId]);

    const worker = workerRes.rows[0];
    if (!worker) {
      return res.status(404).json({ error: 'Not Found', message: 'Worker profile not found.' });
    }

    // Catalog of all trade toolkits
    const catalogRes = await query(`SELECT * FROM mandatory_toolkits ORDER BY id ASC`);
    const catalog = catalogRes.rows.map((t) => {
      let parsedItems = [];
      try {
        parsedItems = typeof t.items_included === 'string' ? JSON.parse(t.items_included) : t.items_included;
      } catch {
        parsedItems = [];
      }
      return { ...t, items: parsedItems };
    });

    // Find the specific mandatory toolkit matching the worker's primary trade
    let mandatoryToolkit = catalog.find((t) =>
      worker.primary_trade && (
        t.trade_category.toLowerCase() === worker.primary_trade.toLowerCase() ||
        worker.primary_trade.toLowerCase().includes(t.trade_category.toLowerCase()) ||
        t.trade_category.toLowerCase().includes(worker.primary_trade.toLowerCase())
      )
    ) || catalog[0] || null;

    // Worker's existing owned tools parsed
    const ownedToolsRaw = (worker.tools_owned || '').toLowerCase();

    // Generate checklist of mandatory items with individual tool pricing
    const totalKitItems = (mandatoryToolkit?.items?.length) || 5;
    const baseIndividualPrice = Math.round((mandatoryToolkit?.subsidized_price || 4500) / totalKitItems);
    const baseMarketPrice = Math.round((mandatoryToolkit?.market_price || 8000) / totalKitItems);

    const checklist = (mandatoryToolkit ? mandatoryToolkit.items : []).map((item, idx) => {
      const itemName = typeof item === 'string' ? item : item.item;
      const isOwned = ownedToolsRaw.length > 0 && ownedToolsRaw.split(',').some((owned) => {
        const cleanOwned = owned.trim();
        return cleanOwned.length > 3 && (itemName.toLowerCase().includes(cleanOwned) || cleanOwned.includes(itemName.toLowerCase()));
      });
      const priceFactor = idx === 0 ? 1.35 : idx === 1 ? 1.15 : idx === 2 ? 1.25 : 0.85;
      const individualSubsidized = Math.max(350, Math.round((baseIndividualPrice * priceFactor) / 50) * 50);
      const individualMarket = Math.max(600, Math.round((baseMarketPrice * priceFactor) / 50) * 50);
      return {
        id: idx + 1,
        item: itemName,
        standard: item.standard || 'ISI Standard',
        mandatory: item.mandatory !== false,
        owned: isOwned || worker.toolkit_compliance === 'VERIFIED_EQUIPPED',
        individual_price: individualSubsidized,
        market_price: individualMarket,
        monthly_emi: Math.round(individualSubsidized / 10),
      };
    });

    // Worker's toolkit orders / loans
    const ordersRes = await query(`
      SELECT o.*, t.kit_name, t.trade_category, t.image_url, t.market_price, t.subsidized_price
      FROM worker_toolkit_orders o
      JOIN mandatory_toolkits t ON o.toolkit_id = t.id
      WHERE o.worker_id = $1
      ORDER BY o.id DESC
    `, [worker.id]);

    const orders = ordersRes.rows;
    const activeLoan = orders.find((o) => o.status === 'ACTIVE_LOAN') || null;

    res.json({
      worker,
      mandatoryToolkit,
      checklist,
      complianceStatus: worker.toolkit_compliance || (checklist.every((c) => c.owned) ? 'VERIFIED_EQUIPPED' : 'PENDING'),
      catalog,
      orders,
      activeLoan,
    });
  } catch (err) {
    console.error('Get worker toolkits error:', err);
    res.status(500).json({ error: 'Server Error', message: 'Failed to fetch worker toolkits.' });
  }
}

/**
 * POST /api/worker-portal/toolkits/order
 * Purchase or finance a mandatory toolkit or individual tool directly through the platform.
 */
async function orderWorkerToolkit(req, res) {
  try {
    const { toolkit_id, payment_mode, delivery_address, individual_tool, individual_price } = req.body;
    const userId = req.user.id;

    const workerRes = await query('SELECT * FROM workers WHERE user_id = $1', [userId]);
    const worker = workerRes.rows[0];
    if (!worker) {
      return res.status(404).json({ error: 'Not Found', message: 'Worker profile not found.' });
    }

    const toolkitRes = await query('SELECT * FROM mandatory_toolkits WHERE id = $1', [toolkit_id]);
    const toolkit = toolkitRes.rows[0];
    if (!toolkit) {
      return res.status(404).json({ error: 'Not Found', message: 'Selected toolkit not found.' });
    }

    if (!['DIRECT_PAY', 'COOP_LOAN'].includes(payment_mode)) {
      return res.status(400).json({ error: 'Validation Error', message: 'Invalid payment mode. Must be DIRECT_PAY or COOP_LOAN.' });
    }

    const isIndividual = Boolean(individual_tool);
    const orderCode = `TKT-ORD-2026-${String(Math.floor(1000 + Math.random() * 9000))}`;
    const totalAmount = isIndividual ? (Number(individual_price) || 850.0) : toolkit.subsidized_price;
    const isLoan = payment_mode === 'COOP_LOAN';
    const paidAmount = isLoan ? 0.0 : totalAmount;
    const remainingAmount = isLoan ? totalAmount : 0.0;
    const monthlyEmi = isLoan ? Math.max(50, Math.round(totalAmount / 10)) : 0.0;
    const orderStatus = isLoan ? 'ACTIVE_LOAN' : 'DELIVERED';
    const deliveryStatus = isLoan ? 'DISPATCHED' : 'DELIVERED';

    const orderInsertRes = await query(`
      INSERT INTO worker_toolkit_orders (
        worker_id, toolkit_id, order_code, payment_mode, total_amount, paid_amount,
        remaining_amount, monthly_emi, status, delivery_address, delivery_status, loan_deduction_per_job
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 50.0)
      RETURNING *
    `, [
      worker.id,
      toolkit.id,
      orderCode,
      payment_mode,
      totalAmount,
      paidAmount,
      remainingAmount,
      monthlyEmi,
      orderStatus,
      delivery_address || 'Cooperative Federation Center Hub',
      deliveryStatus,
    ]);

    // Parse items to append to worker's tools_owned (de-duplicated)
    let itemsToAppend = [];
    if (isIndividual) {
      itemsToAppend = [individual_tool.trim()];
    } else {
      try {
        const parsed = typeof toolkit.items_included === 'string' ? JSON.parse(toolkit.items_included) : toolkit.items_included;
        itemsToAppend = parsed.map((i) => (typeof i === 'string' ? i : i.item).trim());
      } catch {
        itemsToAppend = [toolkit.kit_name.trim()];
      }
    }

    const toolsSet = new Set(
      (worker.tools_owned || '')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    );
    itemsToAppend.forEach((t) => toolsSet.add(t));
    const newToolsOwned = Array.from(toolsSet).join(', ');

    const pointsAward = isIndividual ? 0 : 50;

    // Update worker profile
    await query(`
      UPDATE workers
      SET tools_owned = $1,
          toolkit_compliance = 'VERIFIED_EQUIPPED',
          merit_points = merit_points + $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [newToolsOwned, pointsAward, worker.id]);

    // If cooperative loan, record loan disbursement in society treasury ledger
    if (isLoan) {
      try {
        const txnCode = `TXN-LOAN-${orderCode}`;
        const loanDesc = isIndividual
          ? `Artisan individual tool micro-loan for ${individual_tool} (${orderCode})`
          : `Artisan toolkit micro-loan disbursed for ${toolkit.kit_name} (${orderCode})`;

        await query(`
          INSERT INTO society_treasury_ledger (
            society_id, transaction_code, transaction_type, amount, worker_id, description, balance_after
          ) VALUES (
            1, $1, 'LOAN_DISBURSEMENT', $2, $3, $4, 500000.0
          )
        `, [txnCode, -totalAmount, worker.id, loanDesc]);
      } catch (ledgerErr) {
        console.warn('Treasury ledger log notice:', ledgerErr.message);
      }
    }

    res.json({
      message: isIndividual
        ? (isLoan
            ? `🎉 0% Interest Micro-Loan Approved for ${individual_tool}! Order ${orderCode} dispatched.`
            : `🎉 Direct Purchase Confirmed for ${individual_tool}! Order ${orderCode} processed.`)
        : (isLoan
            ? `🎉 0% Interest Cooperative Toolkit Micro-Loan Approved! Order ${orderCode} dispatched.`
            : `🎉 Toolkit Direct Purchase Confirmed! Order ${orderCode} processed.`),
      order: orderInsertRes.rows[0],
      meritPointsAwarded: pointsAward,
      complianceStatus: 'VERIFIED_EQUIPPED',
    });
  } catch (err) {
    console.error('Order toolkit error:', err);
    res.status(500).json({ error: 'Server Error', message: 'Failed to process toolkit order.' });
  }
}

module.exports = {
  getWorkerDashboard,
  updateAvailability,
  handleJobAction,
  getWorkerWelfare,
  enrollWelfare,
  getWorkerToolkits,
  orderWorkerToolkit,
};

