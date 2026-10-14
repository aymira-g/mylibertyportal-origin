import StudentPhotoCapture from "./StudentPhotoCapture";

export default function StudentPersonalFields({ formData, field }) {
  return (
    <div className="space-y-3">
      <h4 className="text-xs font-black uppercase tracking-wider text-[#1a3a8f] flex items-center gap-1.5">
        <span>👤</span> Personal Information
      </h4>

      {/* Student Headshot Photo Capture / Upload */}
      <StudentPhotoCapture
        photoURL={formData.photoURL}
        onPhotoChange={(url) => field("photoURL", url)}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="md:col-span-2">
          <label htmlFor="student-display-name" className="block text-[10px] font-bold text-slate-500 uppercase mb-1 cursor-pointer">
            Full Name (Nama Lengkap)
          </label>
          <input
            id="student-display-name"
            type="text"
            placeholder="Full Name"
            value={formData.displayName || ""}
            onChange={(e) => field("displayName", e.target.value)}
            className="w-full p-2.5 border rounded-xl font-semibold"
            required
          />
        </div>
        <div>
          <label htmlFor="student-nickname" className="block text-[10px] font-bold text-slate-500 uppercase mb-1 cursor-pointer">
            Nickname (Nama Panggilan)
          </label>
          <input
            id="student-nickname"
            type="text"
            placeholder="e.g. Alex"
            value={formData.nickname || ""}
            onChange={(e) => field("nickname", e.target.value)}
            className="w-full p-2.5 border rounded-xl"
          />
        </div>
        <div>
          <label htmlFor="student-gender" className="block text-[10px] font-bold text-slate-500 uppercase mb-1 cursor-pointer">
            Gender (Jenis Kelamin)
          </label>
          <select
            id="student-gender"
            value={formData.gender || "male"}
            onChange={(e) => field("gender", e.target.value)}
            className="w-full p-2.5 border rounded-xl bg-white font-medium cursor-pointer"
          >
            <option value="male">Laki-laki (Male)</option>
            <option value="female">Perempuan (Female)</option>
          </select>
        </div>
        <div>
          <label htmlFor="student-place-of-birth" className="block text-[10px] font-bold text-slate-500 uppercase mb-1 cursor-pointer">
            Place of Birth (Tempat Lahir)
          </label>
          <input
            id="student-place-of-birth"
            type="text"
            placeholder="e.g. Jakarta"
            value={formData.placeOfBirth || ""}
            onChange={(e) => field("placeOfBirth", e.target.value)}
            className="w-full p-2.5 border rounded-xl"
          />
        </div>
        <div>
          <label htmlFor="student-dob" className="block text-[10px] font-bold text-slate-500 uppercase mb-1 cursor-pointer">
            Date of Birth (Tanggal Lahir)
          </label>
          <input
            id="student-dob"
            type="date"
            value={formData.dob || ""}
            onChange={(e) => field("dob", e.target.value)}
            className="w-full p-2.5 border rounded-xl bg-white"
          />
        </div>
        <div>
          <label htmlFor="student-religion" className="block text-[10px] font-bold text-slate-500 uppercase mb-1 cursor-pointer">
            Religion (Agama)
          </label>
          <input
            id="student-religion"
            type="text"
            placeholder="e.g. Islam / Kristen / Hindu / Buddha"
            value={formData.religion || ""}
            onChange={(e) => field("religion", e.target.value)}
            className="w-full p-2.5 border rounded-xl"
          />
        </div>
        <div>
          <label htmlFor="student-phone" className="block text-[10px] font-bold text-slate-500 uppercase mb-1 cursor-pointer">
            Phone / WhatsApp Pendaftar
          </label>
          <input
            id="student-phone"
            type="tel"
            placeholder="0812..."
            value={formData.phone || ""}
            onChange={(e) => field("phone", e.target.value)}
            className="w-full p-2.5 border rounded-xl"
          />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="student-address" className="block text-[10px] font-bold text-slate-500 uppercase mb-1 cursor-pointer">
            Full Address (Alamat Lengkap)
          </label>
          <textarea
            id="student-address"
            rows={2}
            placeholder="Street, District, City..."
            value={formData.address || ""}
            onChange={(e) => field("address", e.target.value)}
            className="w-full p-2.5 border rounded-xl"
          />
        </div>
      </div>
    </div>
  );
}
