import random
from kivy.app import App
from kivy.uix.boxlayout import BoxLayout
from kivy.uix.label import Label
from kivy.uix.textinput import TextInput
from kivy.uix.button import Button
from kivy.uix.scrollview import ScrollView

class GameQuaySo(BoxLayout):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.orientation = 'vertical'
        self.padding = 20
        self.spacing = 15

        self.danh_sach_mua = []

        # Tiêu đề ứng dụng
        self.add_widget(Label(text='CHƯƠNG TRÌNH QUAY SỐ 2 CHỮ SỐ', font_size='20sp', bold=True, size_hint_y=None, height=40))

        # Ô nhập số cần mua
        self.add_widget(Label(text='Mời nhập số cần mua (2 chữ số):', size_hint_y=None, height=30))
        self.input_so = TextInput(multiline=False, input_filter='int', font_size='24sp', size_hint_y=None, height=50, halign='center')
        self.add_widget(self.input_so)

        # Hàng chứa 2 nút bấm: Chọn số và Quay số
        layout_nut = BoxLayout(size_hint_y=None, height=50, spacing=10)
        
        btn_them = Button(text='Chọn Mua Số', background_color=(0.2, 0.6, 1, 1), font_size='16sp')
        btn_them.bind(on_press=self.them_so)
        layout_nut.add_widget(btn_them)

        btn_quay = Button(text='Bắt Đầu Quay Số', background_color=(0.2, 0.8, 0.2, 1), font_size='16sp')
        btn_quay.bind(on_press=self.quay_so)
        layout_nut.add_widget(btn_quay)
        
        self.add_widget(layout_nut)

        # Khu vực hiển thị kết quả và danh sách số đã mua (Có hỗ trợ cuộn nếu danh sách dài)
        self.label_thong_bao = Label(text='Danh sách số bạn đang có: []', font_size='16sp', halign='center', valign='top')
        self.label_thong_bao.bind(size=self.label_thong_bao.setter('text_size'))
        
        scroll = ScrollView()
        scroll.add_widget(self.label_thong_bao)
        self.add_widget(scroll)

    def them_so(self, instance):
        mua_so = self.input_so.text.strip()
        # Tự động thêm số 0 vào trước nếu người dùng nhập số có 1 chữ số (ví dụ: "5" -> "05")
        if mua_so.isdigit() and len(mua_so) == 1:
            mua_so = mua_so.zfill(2)

        if len(mua_so) == 2 and mua_so.isdigit():
            if mua_so not in self.danh_sach_mua:
                self.danh_sach_mua.append(mua_so)
                self.label_thong_bao.text = f'✅ Đã lưu số: {mua_so}\n\nDanh sách số bạn đang có:\n{", ".join(self.danh_sach_mua)}'
            else:
                self.label_thong_bao.text = f'⚠️ Số {mua_so} đã được mua trước đó rồi!\n\nDanh sách hiện tại:\n{", ".join(self.danh_sach_mua)}'
        else:
            self.label_thong_bao.text = '❌ Lỗi: Bạn phải nhập chính xác số có 2 chữ số!'
        
        self.input_so.text = ''  # Xóa trống ô nhập để tiện nhập số tiếp theo

    def quay_so(self, instance):
        if not self.danh_sach_mua:
            self.label_thong_bao.text = '❌ Bạn chưa mua số nào cả! Hãy chọn ít nhất 1 số trước khi quay.'
            return

        # Thực hiện quay số ngẫu nhiên từ 00 đến 99
        ket_qua = str(random.randint(0, 99)).zfill(2)
        ket_qua_dep = ' '.join(ket_qua)
        
        chuoi_thong_bao = f'🎰 KẾT QUẢ QUAY SỐ: ==> {ket_qua_dep} <==\n\n'
        chuoi_thong_bao += f'Danh sách số bạn đã mua: {", ".join(self.danh_sach_mua)}\n\n'

        if ket_qua in self.danh_sach_mua:
            chuoi_thong_bao += '🎉 Chúc mừng bạn đã trúng số rồi! Đỉnh quá! 🎉'
        else:
            chuoi_thong_bao += '😭 Rất tiếc, các số bạn chọn đều không trúng. Chúc bạn may mắn lần sau!'

        self.label_thong_bao.text = chuoi_thong_bao
        self.danh_sach_mua = []  # Reset lại danh sách sau khi quay xong để chơi lượt mới

class MainApp(App):
    def build(self):
        self.title = 'Ứng dụng Quay Số Kivy'
        return GameQuaySo()

if __name__ == '__main__':
    MainApp().run()
