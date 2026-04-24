import { getSubHostIdsByHostId } from "../models/hostModel.js";
import { getSubGuestsIdsGuestId } from "../models/usersModel.js";

export const subHostPermission = [
  { type: 1, title: 'Dashboard' },
  { type: 2, title: 'Bookings' },
  { type: 3, title: 'Property' },
  { type: 4, title: 'Reviews' },
  { type: 5, title: 'Offers' },
  { type: 6, title: 'Support' },
  { type: 7, title: 'Host Communication' },
  { type: 8, title: 'Reservation Request' },
  { type: 9, title: 'Business Rules' },
  { type: 10, title: 'Cleaning' }
];

export const getAllHostIds = async (userDetails) => {
  if (!userDetails?.[0]) return []; // fallback
  
  const id = userDetails[0]?.host_id;

  let sub_host_ids = [];

  if (userDetails[0].user_type != 3) {
    sub_host_ids = await getSubHostIdsByHostId(id);
  } else {
    sub_host_ids = [userDetails[0].added_by];
  }

  const all_ids = [id];

  if (sub_host_ids?.length > 0) {
    all_ids.push(...sub_host_ids);
  }

  return all_ids;
};

export const getAllGuestsIds = async (userDetails) => {
  if (!userDetails?.[0]) return []; // fallback
  
  const id = userDetails[0]?.id;

  let sub_guest_ids = [];

  if (userDetails[0].user_type == 2) {
    sub_guest_ids = await getSubGuestsIdsGuestId(id);
  } else {
    sub_guest_ids = [];
  }

  const all_ids = [id];

  if (sub_guest_ids?.length > 0) {
    all_ids.push(...sub_guest_ids);
  }

  return all_ids;
};
