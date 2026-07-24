document.addEventListener('DOMContentLoaded', () => {
    const subForm = document.getElementById('subscription-form');
    const paymentMethod = document.getElementById('payment-method');
    const receiptGroup = document.getElementById('receipt-group');
    const receiptPhoto = document.getElementById('receipt-photo');

    // Check if we can connect directly to Supabase
    const supabase = window.getSupabaseClient ? window.getSupabaseClient() : null;

    const handleFormSubmit = async (e, formElement, btnId, msgId) => {
        e.preventDefault();
        const btn = document.getElementById(btnId);
        const msg = document.getElementById(msgId);
        btn.disabled = true;
        btn.textContent = 'Submitting... / पाठवत आहे...';

        const formData = new FormData(formElement);

        if (supabase) {
            // Direct browser to Supabase Mode
            try {
                const name = formData.get('name');
                const address = formData.get('address');
                const phone = formData.get('phone');
                const numberOfCans = parseInt(formData.get('numberOfCans')) || 30;
                const ticketType = formData.get('ticketType') || 'Subscription';
                const currentPaymentMethod = formData.get('paymentMethod') || 'UPI';
                const photoFile = formData.get('photo');
                const receiptFile = formData.get('receiptPhoto');

                if (!name || !address || !phone || !photoFile || photoFile.size === 0) {
                    throw new Error("Name, address, phone, and Aadhar proof are required.");
                }

                if (currentPaymentMethod === 'UPI' && (!receiptFile || receiptFile.size === 0)) {
                    throw new Error("UPI Receipt photo is required for UPI payment.");
                }

                let photoUrl = null;
                let receiptUrl = null;

                // 1. Upload Aadhar photo to Supabase storage 'uploads'
                const aadharExt = photoFile.name.split('.').pop();
                const aadharFileName = `aadhar-${Date.now()}-${Math.round(Math.random() * 1E9)}.${aadharExt}`;
                const { data: aadharData, error: aadharError } = await supabase.storage
                    .from('uploads')
                    .upload(aadharFileName, photoFile);
                if (aadharError) throw aadharError;

                const { data: aadharUrlObj } = supabase.storage
                    .from('uploads')
                    .getPublicUrl(aadharFileName);
                photoUrl = aadharUrlObj.publicUrl;

                // 2. Upload UPI receipt if payment method is UPI
                if (currentPaymentMethod === 'UPI' && receiptFile && receiptFile.size > 0) {
                    const receiptExt = receiptFile.name.split('.').pop();
                    const receiptFileName = `receipt-${Date.now()}-${Math.round(Math.random() * 1E9)}.${receiptExt}`;
                    const { data: receiptData, error: receiptError } = await supabase.storage
                        .from('uploads')
                        .upload(receiptFileName, receiptFile);
                    if (receiptError) throw receiptError;

                    const { data: receiptUrlObj } = supabase.storage
                        .from('uploads')
                        .getPublicUrl(receiptFileName);
                    receiptUrl = receiptUrlObj.publicUrl;
                }

                // 3. Insert ticket record into Supabase
                const { data: ticketData, error: ticketError } = await supabase
                    .from('tickets')
                    .insert([{
                        name,
                        address,
                        phone,
                        request_type: ticketType,
                        number_of_cans: numberOfCans,
                        payment_method: currentPaymentMethod,
                        photo: photoUrl,
                        receipt_photo: receiptUrl,
                        status: 'Pending'
                    }])
                    .select();

                if (ticketError) throw ticketError;

                const ticketId = ticketData[0].id;
                msg.textContent = `Success! ID #${ticketId.slice(-4)} registered directly on Supabase.`;
                msg.className = 'message success';
                formElement.reset();
                if (paymentMethod && paymentMethod.value === 'UPI') {
                    receiptGroup.style.display = 'block';
                    receiptPhoto.required = true;
                }
            } catch (error) {
                console.error("Direct Supabase subscription error:", error);
                msg.textContent = error.message || 'Error: Direct subscription to Supabase failed.';
                msg.className = 'message error';
            } finally {
                msg.classList.remove('hidden');
                setTimeout(() => msg.classList.add('hidden'), 5000);
                btn.disabled = false;
                btn.textContent = 'Register Subscription / वर्गणी नोंदवा';
            }
        } else {
            // Proxy Server Mode
            try {
                const response = await fetch('/api/tickets', {
                    method: 'POST',
                    body: formData
                });

                if (response.ok) {
                    const data = await response.json();
                    msg.textContent = `Success! ID #${data.id.slice(-4)} registered.`;
                    msg.className = 'message success';
                    formElement.reset();
                    if (paymentMethod && paymentMethod.value === 'UPI') {
                        receiptGroup.style.display = 'block';
                        receiptPhoto.required = true;
                    }
                } else {
                    const errorData = await response.json();
                    msg.textContent = errorData.error || 'Error: Could not submit request.';
                    msg.className = 'message error';
                }
            } catch (error) {
                msg.textContent = 'Error: Could not connect to server.';
                msg.className = 'message error';
            } finally {
                msg.classList.remove('hidden');
                setTimeout(() => msg.classList.add('hidden'), 5000);
                btn.disabled = false;
                btn.textContent = 'Register Subscription / वर्गणी नोंदवा';
            }
        }
    };

    subForm.addEventListener('submit', (e) => handleFormSubmit(e, subForm, 'submit-sub', 'sub-message'));

    if (paymentMethod) {
        paymentMethod.addEventListener('change', (e) => {
            if (e.target.value === 'UPI') {
                receiptGroup.style.display = 'block';
                receiptPhoto.required = true;
            } else {
                receiptGroup.style.display = 'none';
                receiptPhoto.required = false;
                receiptPhoto.value = '';
            }
        });
    }

});
