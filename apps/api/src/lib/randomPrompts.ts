export const randomCategories = [
  {
    id: "questions",
    name: "Câu hỏi đôi mình",
    prompts: [
      "Hôm nay có điều gì nhỏ xíu làm em/anh vui không?",
      "Nếu tối nay được hẹn hò 30 phút, mình sẽ làm gì?",
      "Điều nhỏ nhất gần đây làm bạn thấy được yêu là gì?",
      "Kể một khoảnh khắc hôm nay mà bạn muốn người ấy biết."
    ]
  },
  {
    id: "snap",
    name: "Thử thách snap",
    prompts: [
      "Chụp một thứ đang ở ngay bên trái bạn.",
      "Gửi một snap với biểu cảm đáng yêu nhất trong 3 giây.",
      "Chụp bầu trời hoặc góc phòng hiện tại của bạn.",
      "Gửi một tấm ảnh nói: mình vẫn ở đây nè."
    ]
  },
  {
    id: "today",
    name: "Hôm nay làm gì",
    prompts: [
      "Tối nay mình cùng nghe một bài nhạc rồi nói cảm giác đầu tiên.",
      "Hãy nói một câu nhẹ nhàng với người ấy trước khi ngủ.",
      "Đặt lịch một cuộc gọi 10 phút, không cần nói gì lớn lao.",
      "Viết cho nhau 3 điều biết ơn trong ngày."
    ]
  },
  {
    id: "food",
    name: "Ăn gì bây giờ",
    prompts: [
      "Chọn món có màu hồng hoặc trắng cho bữa tiếp theo.",
      "Nếu được ăn chung ngay bây giờ, bạn muốn gọi món gì?",
      "Gửi ảnh đồ uống hiện tại, kể cả chỉ là nước lọc.",
      "Một món ăn làm bạn nhớ đến người ấy là gì?"
    ]
  },
  {
    id: "signal",
    name: "Tín hiệu vũ trụ",
    prompts: [
      "Nếu thấy số 11:11 hôm nay, hãy gửi một trái tim.",
      "Vật đầu tiên bạn chạm vào sau prompt này là tín hiệu cho buổi hẹn tiếp theo.",
      "Bài hát tiếp theo phát lên là mood của đôi mình hôm nay.",
      "Hãy gửi một câu ngắn như một tín hiệu: mình nhớ bạn."
    ]
  }
] as const;

export function drawPrompt(categoryId?: string) {
  const category =
    randomCategories.find((item) => item.id === categoryId) ??
    randomCategories[Math.floor(Math.random() * randomCategories.length)];
  const prompt = category.prompts[Math.floor(Math.random() * category.prompts.length)];
  return { category, prompt };
}
